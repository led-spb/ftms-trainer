export class WakeLockManager {
    private static wakeLockId: WakeLockSentinel|null = null;
    private static eventListenerRigistered: boolean = false;

    public static async requestLock(){
        this.wakeLockId = await navigator.wakeLock.request('screen')

        if( !this.eventListenerRigistered ){
            this.eventListenerRigistered = true
            document.addEventListener('visibilitychange', async () => {
                if (this.wakeLockId !== null && document.visibilityState === 'visible') {
                    this.requestLock()
                }
            })
        }
    }

    public static async releaseLock(){
        if (this.wakeLockId !== null) {
            await this.wakeLockId.release();
            this.wakeLockId = null
        }
    }
}