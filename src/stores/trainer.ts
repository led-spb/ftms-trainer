import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {FTMSDeviceData} from '@/models'

const FTMS_SERVICE_UUID = '00001826-0000-1000-8000-00805f9b34fb';
const INDOOR_BIKE_DATA_CHAR = '00002ad2-0000-1000-8000-00805f9b34fb';
const CONTORL_POINT_CHAR = '00002ad9-0000-1000-8000-00805f9b34fb';

const REQUEST_CONTROL_OP_CODE = 0x00;
const SET_INDOOR_BIKE_SIMULATION_OP_CODE = 0x11;


export const useTrainerStore = defineStore('trainer', () => {
    const targetGrade = ref(0.0);

    const windValue = 0;
    const crrValue = 0.0060;
    const cwValue = 0.33;

    const bluetoothDevice = ref();
    let controlPointChar: any = null;
    let indoorBikeDataChar = null;

    const speed = ref(<number>0);
    const power = ref(<number>0);
    const cadence = ref(<number>0);

    const grade = computed(() => targetGrade.value)
  
    const isConnected = computed(() => {
        return bluetoothDevice.value != null && bluetoothDevice.value.gatt.connected;
    })
    const deviceName = computed(() => {
        return isConnected.value ? bluetoothDevice.value.name : null;
    })

    async function setBikeSimulation(grade: number){
        if( controlPointChar != null){
            const command = new DataView(new ArrayBuffer(7));

            command.setUint8(0, SET_INDOOR_BIKE_SIMULATION_OP_CODE);
            command.setInt16(1, windValue*1000, true);
            command.setInt16(3, grade*100, true);
            command.setUint8(5, crrValue*10000);
            command.setUint8(6, cwValue*100);

            await controlPointChar.writeValue(command.buffer)
            targetGrade.value = grade
        }
        return targetGrade
    }

    function onBikeDataChanged(event: Event){
         const value = (event.target as any).value;

         const flags = value.getUint16(0, true);

         let offset = 2
         speed.value = value.getUint16(offset, true) * 0.01
         offset += 2

         // Instantaneous Cadence
         if( flags & (1 << 2) ){
            cadence.value = value.getUint16(offset, true) * 0.5
            offset += 2
         }
         if( flags & (1 << 6) ){
            power.value = value.getInt16(offset, true)
            offset += 2
         }
    }
    function onBikeCommandExecuted(event: Event){
        const value = (event.target as any).value as DataView;

        const responseCode = value.getUint8(0);
        const requestOpCode = value.getUint8(1);
        const requestResCode = value.getUint8(2);
        //console.log(`Trainer responseCode: ${responseCode}, requestOpCode: ${requestOpCode}, result: ${requestResCode}`)
    }

    async function selectDevice(){
        const device = await (navigator as any).bluetooth.requestDevice({
            filters: [
                { services: [FTMS_SERVICE_UUID, ] }
            ],
            optionalServices: []
        });

        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(FTMS_SERVICE_UUID);

        // request trainer control
        controlPointChar = await service.getCharacteristic(CONTORL_POINT_CHAR);
        controlPointChar.addEventListener('characteristicvaluechanged', onBikeCommandExecuted);
        await controlPointChar.startNotifications()
        await controlPointChar.writeValue(new Uint8Array([REQUEST_CONTROL_OP_CODE]))

        // subscribe to bike data
        indoorBikeDataChar = await service.getCharacteristic(INDOOR_BIKE_DATA_CHAR);
        indoorBikeDataChar.addEventListener('characteristicvaluechanged', onBikeDataChanged);
        await indoorBikeDataChar.startNotifications();

        bluetoothDevice.value = device
        return device
    }
    
    return { selectDevice, setBikeSimulation, deviceName, isConnected, speed, power, cadence, grade }
})
