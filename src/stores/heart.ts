import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const HRM_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
const HRM_CHARACTERISTIC_UUID = '00002a37-0000-1000-8000-00805f9b34fb';

const BATTERY_SERVICE_UUID = '0000180f-0000-1000-8000-00805f9b34fb';
const BATTERY_CHARACTERISRIC_UUID = '00002a19-0000-1000-8000-00805f9b34fb';


export const useHeartStore = defineStore('heart', () => {
    const bluetoothDevice = ref();

    const heartRate = ref<number|null>(null)
    const batteryLevel = ref<number|undefined>(undefined)
    const connectingState = ref<boolean>(false)

    const isConnected = computed(() => {
        return bluetoothDevice.value != null && bluetoothDevice.value.gatt.connected;
    })
    const isConnecting = computed(() => connectingState.value )

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

    async function getDeviceBatteryLevel(server :BluetoothRemoteGATTServer|undefined){
        try{
            const batteryService = await server?.getPrimaryService(BATTERY_SERVICE_UUID);
            const batteryChar = await batteryService?.getCharacteristic(BATTERY_CHARACTERISRIC_UUID);
            const batteryData = await batteryChar?.readValue()

            batteryLevel.value = batteryData?.getUint8(0)
        }catch(err){
            batteryLevel.value = undefined
            console.error(err)
        }
    }

    async function selectDevice(){
        connectingState.value = true
        try{
            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: [HRM_SERVICE_UUID, ] }
                ],
                optionalServices: [BATTERY_SERVICE_UUID]
            });

            const server = await device?.gatt?.connect();
            device.addEventListener('gattserverdisconnected', () => {
                console.log(`${device.name} disconnected`)
                bluetoothDevice.value = null
                heartRate.value = null
                batteryLevel.value = undefined
            })

            const service = await server?.getPrimaryService(HRM_SERVICE_UUID);
            const hrmChar = await service?.getCharacteristic(HRM_CHARACTERISTIC_UUID);

            await hrmChar?.startNotifications();
            hrmChar?.addEventListener('characteristicvaluechanged', onHrmDataChanged);
            bluetoothDevice.value = device;

            getDeviceBatteryLevel(server)
        } finally {
            connectingState.value = false
        }
    }
    
    return { selectDevice, deviceName, batteryLevel, isConnected, isConnecting, heartRate };
})
