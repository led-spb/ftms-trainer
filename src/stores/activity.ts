import { computed, ref, type Ref } from 'vue'
import { defineStore } from 'pinia'

import { FitEncoder } from '@/lib/fit'

import { type GeoPathStrategy } from '@/lib/geo'

export const useActivityStore = defineStore('activity', () => {
    const started = ref(false)

    const distance = ref(0)
    const climb = ref(0)
    const elapsed = ref(0)
    const activityFitData = ref<Uint8Array>()

    const fitEncoder = new FitEncoder()

    let timerId: any = null

    function startActivity(metrics: Ref, geoPathStrategy: GeoPathStrategy|null){
        started.value = true

        distance.value = 0
        elapsed.value = 0

        climb.value = 0
        let altitude = 0
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
            const deltaAltitude = deltaDistance*value.grade/100

            altitude += deltaAltitude

            distance.value += deltaDistance
            climb.value += deltaAltitude > 0 ? deltaAltitude : 0

            if( geoPathStrategy ){
                try {
                    const geoPoint = geoPathStrategy.geoPointByDistance(distance.value)
                    latitude = geoPoint ? geoPoint.latitude : null
                    longitude = geoPoint ? geoPoint.longitude : null
                    if( geoPoint && geoPoint.altitude != null )
                        altitude = geoPoint.altitude
                } catch (err) {
                    console.error(err)
                }
            }

            fitEncoder.addActivityRecord(
                distance.value, value.speed/3.6, altitude,
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

    return { isStarted, startActivity, stopActivity, activityFitData, distance, elapsed, climb };
})
