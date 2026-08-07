export class BLEDevice {
    private device: BluetoothDevice;

    constructor (device: BluetoothDevice ){
        this.device = device
    }

    get name(): string|undefined {
        return this.device.name
    }

    public async connect(){
        await this.device.gatt?.connect()
    }

    public async requestService(serviceUUID: string){
        return await this.device.gatt?.getPrimaryService(serviceUUID)
    }
}


export class BLEDeviceManager {

    public static async selectDeviceByService(serviceUUIDs :string[]): Promise<BLEDevice>{
        const device: BluetoothDevice = await navigator.bluetooth.requestDevice({
            filters: [
                { services: serviceUUIDs }
            ],
            optionalServices: []}
        );
        return new BLEDevice(device)
    }
}
