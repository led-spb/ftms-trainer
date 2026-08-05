import { computed, ref, type Ref } from 'vue'
import { defineStore } from 'pinia'

import { Encoder, Profile, Utils  } from '@garmin/fitsdk'


export const useActivityStore = defineStore('activity', () => {
    const started = ref(false)
    let activityStartTime: number = 0
    let activityTimestamp: number = 0

    const semicirclesPerMeter = 107.173;

    const activityFitMessages: any[] = [];

    const distance = ref(0)
    const climb = ref(0)
    const elapsed = ref(0)
    const activityFitData = ref<Uint8Array>()

    let timerId: any = null
    let wakeLockId: any = null;

    async function requestWakeLock() {
        return await navigator.wakeLock.request('screen');
    }

    function exportFitData(){
        const encoder = new Encoder();
        activityFitMessages.forEach((mesg) => {
            encoder.writeMesg(mesg);
        });
        return encoder.close();        
    }

    function startActivity(metrics: Ref){
        started.value = true

        distance.value = 0
        elapsed.value = 0

        climb.value = 0
        let altitude = 0

        prepareFitFile()

        activityTimestamp = activityStartTime
        timerId = setInterval(() => {

            const nowTimestamp = Utils.convertDateToDateTime(new Date()) 
            const elapsedTime = nowTimestamp - activityTimestamp

            elapsed.value += elapsedTime

            const value = metrics.value

            const deltaDistance = value.speed/3.6 * elapsedTime
            const deltaAltitude = deltaDistance/100*value.grade

            altitude += deltaAltitude

            distance.value += deltaDistance
            climb.value += deltaAltitude > 0 ? deltaAltitude : 0

            activityFitMessages.push({
                mesgNum: Profile.MesgNum.RECORD,
                timestamp: nowTimestamp,
                distance: distance.value,
                enhancedSpeed: value.speed, 
                power: value.power,
                cadence: value.cadence,
                heartRate: value.heartRate,

                enhancedAltitude: altitude,

                positionLat: 0, // Flat Line
                positionLong: distance.value * semicirclesPerMeter, // Ramp
            })

            activityTimestamp = nowTimestamp
        }, 1000)

        requestWakeLock().then( (value) => {
            wakeLockId = value
        })
    }

    function prepareFitFile(){
        activityFitMessages.length = 0

        // The starting timestamp for the activity
        const now = new Date();
        // const localTimestampOffset = now.getTimezoneOffset() * -60;
        activityStartTime = Utils.convertDateToDateTime(now);

        // Every FIT file MUST contain a File ID message
        activityFitMessages.push({
            mesgNum: Profile.MesgNum.FILE_ID,
            type: "activity",
            manufacturer: "development",
            product: 0,
            timeCreated: activityStartTime,
            serialNumber: 1234,
        });

        // A Device Info message is a BEST PRACTICE for FIT ACTIVITY files
        activityFitMessages.push({
            mesgNum: Profile.MesgNum.DEVICE_INFO,
            deviceIndex: "creator",
            manufacturer: "development",
            product: 0,
            productName: "FIT Cookbook",
            serialNumber: 1234,
            softwareVersion: 12.34,
            timestamp: activityStartTime,
        });

        // Timer Events are a BEST PRACTICE for FIT ACTIVITY files
        activityFitMessages.push({
            mesgNum: Profile.MesgNum.EVENT,
            timestamp: activityStartTime,
            event: "timer",
            eventType: "start",
        });
    }

    function finalizeFitFile(){
    // Timer Events are a BEST PRACTICE for FIT ACTIVITY files
        activityFitMessages.push({
            mesgNum: Profile.MesgNum.EVENT,
            timestamp: activityTimestamp,
            event: "timer",
            eventType: "stop",
        });

        // Every FIT ACTIVITY file MUST contain at least one Lap message
        activityFitMessages.push({
            mesgNum: Profile.MesgNum.LAP,
            messageIndex: 0,
            timestamp: activityTimestamp,
            startTime: activityStartTime,
            totalElapsedTime: activityTimestamp - activityStartTime,
            totalTimerTime: activityTimestamp - activityStartTime,
        });

        // Every FIT ACTIVITY file MUST contain at least one Session message
        activityFitMessages.push({
            mesgNum: Profile.MesgNum.SESSION,
            messageIndex: 0,
            timestamp: activityTimestamp,
            startTime: activityStartTime,
            totalElapsedTime: activityTimestamp - activityStartTime,
            totalTimerTime: activityTimestamp - activityStartTime,
            sport: "cycling",
            subSport: "virtualActivity",
            firstLapIndex: 0,
            numLaps: 1,
        });

        // Every FIT ACTIVITY file MUST contain EXACTLY one Activity message
        activityFitMessages.push({
            mesgNum: Profile.MesgNum.ACTIVITY,
            timestamp: activityTimestamp,
            numSessions: 1,
            localTimestamp: activityTimestamp + (new Date()).getTimezoneOffset()*-60,
            totalTimerTime: activityTimestamp - activityStartTime,
        });     
    }

    function stopActivity(){
        started.value = false;
        clearInterval(timerId);
        // console.log(activityFitMessages)

        if (wakeLockId !== null) {
            wakeLockId.release();
            wakeLockId = null;
        }
        finalizeFitFile()
        activityFitData.value = exportFitData()
    }

    const isStarted = computed(() => {
        return started.value
    })

    return { isStarted, startActivity, stopActivity, activityFitData, distance, elapsed, climb };
})
