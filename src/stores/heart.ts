import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const HRM_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
const HRM_CHARACTERISTIC_UUID = '00002a37-0000-1000-8000-00805f9b34fb';

export const useHeartStore = defineStore('heart', () => {
    const bluetoothDevice = ref();

    const heartRate = ref(<number>0)

    const isConnected = computed(() => {
        return bluetoothDevice.value != null && bluetoothDevice.value.gatt.connected;
    })

    const deviceName = computed(() => {
        return isConnected.value ? bluetoothDevice.value.name : null;
    })

    let firstEventTimestamp = 0;
    const rawEvents: number[] = [];

    function onHrmDataChanged(event: Event){
        const value = (event.target as any).value;
        const flags = value.getUint8(0);

        let heartRateValue = flags & 0x01 ? value.getUint16(1, true) : value.getUint8(1);

        if( event.timeStamp - firstEventTimestamp >= 1000 ){
            heartRate.value = rawEvents.length > 0 ? rawEvents.reduce( (acc, current) => acc+current, 0 ) / rawEvents.length : 0
            rawEvents.length = 0
        }
        rawEvents.push(heartRateValue)
    }

    async function selectDevice(){
        const device = await (navigator as any).bluetooth.requestDevice({
            filters: [
                { services: [HRM_SERVICE_UUID, ] }
            ],
            optionalServices: []
        });

        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(HRM_SERVICE_UUID);
        const hrmChar = await service.getCharacteristic(HRM_CHARACTERISTIC_UUID);

        await hrmChar.startNotifications();

        hrmChar.addEventListener('characteristicvaluechanged', onHrmDataChanged);
        bluetoothDevice.value = device;
    }
    
    return { selectDevice, deviceName, isConnected, heartRate };
})
