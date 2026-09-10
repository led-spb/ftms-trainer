import { computed, ref, watch, type Ref, type ComputedRef} from 'vue';
import { defineStore } from 'pinia';
import { Route } from '@/lib/geo';
import { type IActivity, type IRoute } from '@/models';
import { trainerDb } from '@/lib/db';
import { Activity } from '@/lib/activity';


export const useRecorderStore = defineStore('recorder', () => {
    const activity = ref<Activity>(new Activity({distance: 0, elapsed: 0}));
    const recordInProgress = ref<boolean>(false);

    // metrics from trainer/bike/hrm
    let speed = ref<number>();
    let power = ref<number|undefined>();
    let heartRate = ref<number|undefined>();
    let cadence = ref<number|undefined>();
    let grade = ref<number>();

    const route = ref<Route>()

    // Load last unfinished activity
    trainerDb.activities.filter(
        activity => activity.finishDate == undefined
    ).last().then(
        value => {
            if (value){
                activity.value = new Activity(value);
            }
        }
    )

    // Load activity route
    trainerDb.activeRoute.filter(() => true).last().then(
        value => {
            if( value ){
                route.value = new Route(value.id, value.name, value.waypoints);
            }else{
                route.value = undefined;
            }
        }
    )

    function attachSensors(speedSensor: ComputedRef<number>, powerSensor: ComputedRef<number|undefined>, cadenceSensor: ComputedRef<number|undefined>, heartRateSensor: ComputedRef<number|undefined>, gradeSensor: Ref<number>){
        speed = speedSensor
        power = powerSensor
        cadence = cadenceSensor
        heartRate = heartRateSensor
        grade = gradeSensor
    }
 
    watch([() => activity.value.distance, route], async ([newDistance, newRoute] ) => {
        if( newRoute ){
            const geoPoint = newRoute.geoPointByDistance(newDistance)
            if( geoPoint ){
                activity.value.latitude = geoPoint.latitude
                activity.value.longitude = geoPoint.longitude
                activity.value.altitude = geoPoint.altitude
                if( geoPoint.grade != undefined ){
                    grade.value = Math.floor(geoPoint.grade*10)/10
                }
            }
        }
        // store track point
        if( recordInProgress.value ){
            await activity.value.save()
            await activity.value.addRecord({
                activityId: activity.value.id!,
                distance: activity.value.distance,
                enhancedSpeed: (speed.value ?? 0 ) / 3.6,
                enhancedAltitude: activity.value.altitude,
                power: power.value,
                cadence: cadence.value,
                heartRate: heartRate.value,
                positionLat: activity.value.latitude,
                positionLong: activity.value.longitude,
            })
        }
    })

    let timerId: any = null

    function newActivity(){
        activity.value = new Activity({startDate: new Date(), distance: 0, elapsed: 0})
    }

    async function startActivity(){
        if( recordInProgress.value )
            return

        await trainerDb.activeRoute.clear()
        if( route.value ){
            await trainerDb.activeRoute.put({
                id: route.value.id,
                name: route.value.name,
                waypoints: route.value.waypoints.map( point => ({...point}))
            })
        }

        let activityTimestamp = (new Date()).getTime()/1000
        await activity.value.save()

        timerId = setInterval(() => {
            const nowTimestamp = (new Date()).getTime()/1000 
            const elapsedTime = nowTimestamp - activityTimestamp

            activity.value.elapsed += elapsedTime
            // delta distance
            const deltaDistance = (speed.value ?? 0)/3.6 * elapsedTime
            activity.value.distance += deltaDistance

            activityTimestamp = (new Date()).getTime()/1000
        }, 1000)
        recordInProgress.value = true
    }

    async function stopActivity(){
        if( recordInProgress.value ){
            pauseActivity()
        }
        activity.value.finishDate = new Date();
        await activity.value.save()
        console.log(`activity saved`)
    }

    function pauseActivity(){
        if(recordInProgress.value){
            clearInterval(timerId)
            recordInProgress.value = false
        }
    }

    return { 
        isStarted: computed(() => recordInProgress.value), 
        activeRoute: route,
        activity,

        attachSensors, newActivity, startActivity, pauseActivity, stopActivity 
    };
})
