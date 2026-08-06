import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const FTMS_SERVICE_UUID = '00001826-0000-1000-8000-00805f9b34fb';
const INDOOR_BIKE_DATA_CHAR = '00002ad2-0000-1000-8000-00805f9b34fb';
const CONTORL_POINT_CHAR = '00002ad9-0000-1000-8000-00805f9b34fb';

const REQUEST_CONTROL_OP_CODE = 0x00;
const SET_INDOOR_BIKE_SIMULATION_OP_CODE = 0x11;


export const useTrainerStore = defineStore('trainer', () => {
    const targetGrade = ref(0.5);

    const windValue = 0;
    const crrValue = 0.0060;
    const cwValue = 0.33;

    const bluetoothDevice = ref();
    let controlPointChar: any = null;
    let indoorBikeDataChar = null;

    const speed = ref<number|null>(null);
    const power = ref<number|null>(null);
    const cadence = ref<number|null>(null);

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

    let firstEventTimestamp = 0;
    const rawEvents: any[] = [];

    function onBikeDataChanged(event: Event){
        const value = (event.target as any).value;

        const flags = value.getUint16(0, true);


        let speedValue = value.getUint16(2, true) * 0.01
        let powerValue = 0
        let cadenceValue = 0

        let offset = 4

        // Instantaneous Cadence is present
        if( flags & (1 << 2) ){
            cadenceValue = value.getUint16(offset, true) * 0.5
            offset += 2
        }
        // Instantaneous Power is present
        if( flags & (1 << 6) ){
            powerValue = value.getInt16(offset, true)
            offset += 2
        }

        // Aggregate date within one second
        if( event.timeStamp - firstEventTimestamp >= 1000 ){
            speed.value = rawEvents.length > 0 ? rawEvents.reduce( (acc :number, current :any) => acc + current.speed, 0) / rawEvents.length : 0
            power.value = rawEvents.length > 0 ? rawEvents.reduce( (acc :number, current :any) => acc + current.power, 0) / rawEvents.length : 0
            cadence.value = rawEvents.length >0 ? rawEvents.reduce( (acc :number, current :any) => acc + current.cadence, 0) / rawEvents.length : 0

            rawEvents.length = 0
            firstEventTimestamp = event.timeStamp
        }
        rawEvents.push({
            speed: speedValue, 
            power: powerValue, 
            cadence: cadenceValue
        })
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
