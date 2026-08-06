import {Encoder, Profile, Utils, Decoder, Stream, type FitMessages, type RecordMesg} from '@garmin/fitsdk'

const semicirclesPerMeter = 107.173
const semicirclesPerDegree = Math.pow(2,31)/180


export class FitEncoder {
    private messages: any[]
    private totalDistance: number
    activityStartTime!: number

    constructor (){
        this.messages = []
        this.totalDistance = 0
    }

    public beginActivity(){
        this.messages.length = 0
        this.totalDistance = 0

        const now = Utils.convertDateToDateTime(new Date());

        // Every FIT file MUST contain a File ID message
        this.messages.push({
            mesgNum: Profile.MesgNum.FILE_ID,
            type: "activity",
            manufacturer: "development",
            product: 0,
            timeCreated: now,
            serialNumber: 1234,
        });

        // A Device Info message is a BEST PRACTICE for FIT ACTIVITY files
        this.messages.push({
            mesgNum: Profile.MesgNum.DEVICE_INFO,
            deviceIndex: "creator",
            manufacturer: "development",
            product: 0,
            productName: "FIT Cookbook",
            serialNumber: 1234,
            softwareVersion: 12.34,
            timestamp: now,
        });

        // Timer Events are a BEST PRACTICE for FIT ACTIVITY files
        this.messages.push({
            mesgNum: Profile.MesgNum.EVENT,
            timestamp: now,
            event: "timer",
            eventType: "start",
        });
        this.activityStartTime = now
    }

    public addActivityRecord(
        distance: number,
        speed: number,
        altitude: number|null = null,
        power: number|null = null,
        cadence: number|null = null,
        heartRate: number|null = null,
        positionLat: number|null = null,
        positionLong: number|null = null,
    ){
        const now = Utils.convertDateToDateTime(new Date());

        this.messages.push({
            mesgNum: Profile.MesgNum.RECORD,
            timestamp: now,
            distance: distance,
            enhancedSpeed: speed,
            power: power,
            cadence: cadence,
            heartRate: heartRate,
            enhancedAltitude: altitude,
            positionLat: positionLat != null ? positionLat * semicirclesPerDegree : null,
            positionLong: positionLong != null ? positionLong * semicirclesPerDegree : null,
        })

        if( this.totalDistance < distance ){
            this.totalDistance = distance
        }
    }

    public stopActivity(sportType: string="cycling", subSportType: string="virtualActivity"){
        const now = Utils.convertDateToDateTime(new Date());

        // Timer Events are a BEST PRACTICE for FIT ACTIVITY files
        this.messages.push({
            mesgNum: Profile.MesgNum.EVENT,
            timestamp: now,
            event: "timer",
            eventType: "stop",
        });

        // Every FIT ACTIVITY file MUST contain at least one Lap message
        this.messages.push({
            mesgNum: Profile.MesgNum.LAP,
            messageIndex: 0,
            timestamp: now,
            startTime: this.activityStartTime,
            totalElapsedTime: now - this.activityStartTime,
            totalTimerTime: now - this.activityStartTime,
        });

        // Every FIT ACTIVITY file MUST contain at least one Session message
        this.messages.push({
            mesgNum: Profile.MesgNum.SESSION,
            messageIndex: 0,
            timestamp: now,
            startTime: this.activityStartTime,
            totalElapsedTime: now - this.activityStartTime,
            totalTimerTime: now - this.activityStartTime,
            totalDistance: this.totalDistance,
            sport: sportType,
            subSport: subSportType,
            firstLapIndex: 0,
            numLaps: 1,
        });

        // Every FIT ACTIVITY file MUST contain EXACTLY one Activity message
        this.messages.push({
            mesgNum: Profile.MesgNum.ACTIVITY,
            timestamp: now,
            numSessions: 1,
            localTimestamp: now + (new Date()).getTimezoneOffset()*-60,
            totalTimerTime: now - this.activityStartTime,
        });
    }

    public export(): Uint8Array{
        const encoder = new Encoder();
        this.messages.forEach((message) => { encoder.writeMesg(message) });
        return encoder.close();
    }
}


export class FitDecoder {
    private messages!: FitMessages;

    public import(fileContent: ArrayBuffer){
        const stream = Stream.fromArrayBuffer(fileContent)
        const decoder = new Decoder(stream);

        console.log("isFIT (instance method): " + decoder.isFIT());
        console.log("checkIntegrity: " + decoder.checkIntegrity());

        //this.messages, errors
        this.messages = decoder.read().messages;
    }

    public getRecords(): RecordMesg[] {
        const records = this.messages.recordMesgs || []

        return records?.map( (value: RecordMesg) => {
            if( value.positionLat != null)
                value.positionLat = value.positionLat/semicirclesPerDegree

            if( value.positionLong != null)
                value.positionLong = value.positionLong/semicirclesPerDegree

            return value;
        })
    }

}