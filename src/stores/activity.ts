import { computed, ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { FitEncoder } from '@/lib/fit'
import { NullPathStrategy, type GeoPathStrategy } from '@/lib/geo'


export const useActivityStore = defineStore('activity', () => {
    const started = ref(false)

    const distance = ref(0)
    const climb = ref(0)
    const elapsed = ref(0)
    const altitude = ref<number|null>(null)
    const activityFitData = ref<Uint8Array>()

    const fitEncoder = new FitEncoder()

    let geoPathStrategy: GeoPathStrategy = new NullPathStrategy();

    const altitudeProfile = computed(() => {
        const startPoint: number = distance.value >= 1000 ? Math.trunc(distance.value/1000-1)*1000 : 0
        const altitudes = []

        for (let distance = startPoint; distance-startPoint < 5000; distance+=100) {
            const point = geoPathStrategy.geoPointByDistance(distance)
            if( point && point.altitude != null){
                altitudes.push({x: distance/1000, y: point.altitude})
            }
        }
        return altitudes;
    })

    let timerId: any = null

    function setGeoPathStrategy(strategy: GeoPathStrategy){
        geoPathStrategy = strategy 
    }

    function startActivity(metrics: Ref, trainerGrade: (value: number) => any){
        started.value = true

        distance.value = 0
        elapsed.value = 0

        climb.value = 0
        altitude.value  = null
        let longitude: number|null = null
        let latitude: number|null = null

        fitEncoder.beginActivity()
        console.log(geoPathStrategy)

        let activityTimestamp = (new Date()).getTime()/1000

        // Collect data every second
        timerId = setInterval(() => {
            const nowTimestamp = (new Date()).getTime()/1000 
            const elapsedTime = nowTimestamp - activityTimestamp

            elapsed.value += elapsedTime

            const value = metrics.value

            const deltaDistance = value.speed/3.6 * elapsedTime
            distance.value += deltaDistance

            // Calculate new altitude from grade
            let newAltitude = (altitude.value ?? 0) + deltaDistance*value.grade/100
 
            try {
                const geoPoint = geoPathStrategy.geoPointByDistance(distance.value)
                if( geoPoint != null){
                    latitude = geoPoint ? geoPoint.latitude : null
                    longitude = geoPoint ? geoPoint.longitude : null

                    if( geoPoint.grade != null)
                        trainerGrade( Math.floor(geoPoint.grade*10)/10 )
                    if( geoPoint.altitude != null )
                        newAltitude = geoPoint.altitude
                }
            } catch (err) {
                console.error(err)
            }

            const deltaAltitude = newAltitude - (altitude.value ?? newAltitude)
            climb.value += deltaAltitude > 0 ? deltaAltitude : 0

            altitude.value = newAltitude

            fitEncoder.addActivityRecord(
                distance.value, value.speed/3.6, altitude.value,
                value.power, value.cadence, value.heartRate,
                latitude, longitude, 
            )

            activityTimestamp = nowTimestamp
        }, 1000)
    }

    function stopActivity(){
        started.value = false;
        clearInterval(timerId);
        fitEncoder.stopActivity("cycling", "virtualActivity")
        activityFitData.value = fitEncoder.export()
    }

    const isStarted = computed(() => {
        return started.value
    })

    return { isStarted, setGeoPathStrategy, startActivity, stopActivity, altitudeProfile, activityFitData, distance, altitude, elapsed, climb };
})
