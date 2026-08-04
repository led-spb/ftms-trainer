import { computed, ref, type Ref } from 'vue'
import { defineStore } from 'pinia'


export const useActivityStore = defineStore('activity', () => {
    const started = ref(false)

    const distance = ref(0)
    const elapsed = ref(0)

    let timerId: any = null
    let wakeLock: any = null;

    async function requestWakeLock() {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
        } catch (err: Error|any) {
            console.error(`${err.name}, ${err.message}`);
        }
        return wakeLock;
    }    

    function startActivity(speed: Ref){
        started.value = true

        distance.value = 0
        elapsed.value = 0
        timerId = setInterval(() => {
            elapsed.value += 1
            distance.value += speed.value/3.6
        }, 1000)

        requestWakeLock()
    }

    function stopActivity(){
        started.value = false;
        clearInterval(timerId);

        if (wakeLock !== null) {
            wakeLock.release();
            wakeLock = null;
        }        
    }

    const isStarted = computed(() => {
        return started.value
    })

    return { isStarted, startActivity, stopActivity, distance, elapsed };
})
