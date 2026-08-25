import { computed, ref, watch, type Ref, type ComputedRef} from 'vue'
import { defineStore } from 'pinia'
import { FitEncoder } from '@/lib/fit'
import { Route } from '@/lib/geo'


export const useActivityStore = defineStore('activity', () => {
    const started = ref(false)
    const isStarted = computed(() => started.value)

    const distance = ref(0)
    const elapsed = ref(0)
    const altitude = ref<number|null>(null)
    const longitude = ref<number|null>(null)
    const latitude = ref<number|null>(null)

    const activityFitData = ref<Uint8Array>()

    // metrics from trainer/bike/hrm
    let speed = ref<number>();
    let power = ref<number|null>();
    let heartRate = ref<number|null>();
    let cadence = ref<number|null>();
    let grade = ref<number>();


    const fitEncoder = new FitEncoder()

    const route = ref<Route>()

    function attachSensors(speedSensor: ComputedRef<number>, powerSensor: ComputedRef<number|null>, cadenceSensor: ComputedRef<number|null>, heartRateSensor: ComputedRef<number|null>, gradeSensor: Ref<number>){
        speed = speedSensor
        power = powerSensor
        cadence = cadenceSensor
        heartRate = heartRateSensor
        grade = gradeSensor
    }
 
    watch([distance, route], ([newDistance, newRoute] ) => {
        if( newRoute ){
            const geoPoint = newRoute.geoPointByDistance(newDistance)
            if( geoPoint ){
                latitude.value = geoPoint.latitude
                longitude.value = geoPoint.longitude
                altitude.value = geoPoint.altitude
                if( geoPoint.grade != undefined ){
                    grade.value = Math.floor(geoPoint.grade*10)/10
                }
            }
        }
        // store track point
        if( started.value ){
            fitEncoder.addActivityRecord(
                distance.value, (speed.value ?? 0 ) / 3.6,
                altitude.value, power.value, cadence.value, heartRate.value,
                latitude.value, longitude.value
            )
        }
    })

    let timerId: any = null

    function startActivity(){
        let activityTimestamp = (new Date()).getTime()/1000

        distance.value = 0
        elapsed.value = 0
        altitude.value  = null
        longitude.value = null
        latitude.value = null

        started.value = true
        fitEncoder.beginActivity()

        timerId = setInterval(() => {
            const nowTimestamp = (new Date()).getTime()/1000 
            const elapsedTime = nowTimestamp - activityTimestamp

            elapsed.value += elapsedTime
            // delta distance
            const deltaDistance = (speed.value ?? 0)/3.6 * elapsedTime
            distance.value += deltaDistance

            activityTimestamp = (new Date()).getTime()/1000
        }, 1000)
    }

    function stopActivity(){
        started.value = false;
        clearInterval(timerId);
        fitEncoder.stopActivity("cycling", "virtualActivity")
        activityFitData.value = fitEncoder.export()
    }

    return { isStarted, route, attachSensors, startActivity, stopActivity, activityFitData, distance, latitude, longitude, altitude, elapsed };
})
