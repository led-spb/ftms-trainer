import type { IActivity, IActivityRecord, IRoute } from "@/models";
import { trainerDb } from "./db";
import { Encoder, Profile, Utils } from "@garmin/fitsdk";

export class Activity implements IActivity {
    id?: number
    startDate?: Date
    finishDate?: Date
    distance: number
    elapsed: number
    latitude?: number
    longitude?: number
    altitude?: number

    public get totalTime(): number|undefined {
        if( !this.startDate || !this.finishDate)
            return
        return Math.trunc((this.finishDate!.getTime()-this.startDate!.getTime()) / 1000)
    }

    constructor (activity: IActivity){
        this.id = activity.id
        this.startDate = activity.startDate
        this.finishDate = activity.finishDate
        this.distance = activity.distance
        this.elapsed = activity.elapsed
        this.latitude = activity.latitude
        this.longitude = activity.longitude
    }

    public async save(){
        if( this.id == undefined ){
            this.id = await trainerDb.activities.add(this)
        }else{
            await trainerDb.activities.update(this.id, this)
        }
    }

    public async records(): Promise<IActivityRecord[]> {
        if( this.id == undefined)
            return []
        return await trainerDb.activityRecords.where("activityId").equals(this.id!).toArray()
    }

    public async addRecord(record: IActivityRecord){
        if( this.id == undefined)
            return
        await trainerDb.activityRecords.add({...record, timestamp: new Date(), activityId: this.id})
    }

    public async exportFit(): Promise<Uint8Array>{
        const semicirclesPerDegree = Math.pow(2,31)/180;

        const records = await this.records()

        const encoder = new Encoder();
        const createdTimestamp = Utils.convertDateToDateTime(this.startDate ?? new Date());
        const sportType: string="cycling"
        const subSportType: string="virtualActivity"


        encoder.writeMesg(<any>{
            mesgNum: Profile.MesgNum.FILE_ID,
            type: 'activity',
            manufacturer: 'thinkrider',
            product: 1,
            timeCreated: createdTimestamp,
        });
        encoder.writeMesg(<any>{
            mesgNum: Profile.MesgNum.DEVICE_INFO,
            deviceIndex: "creator",
            manufacturer: "thinkrider",
            product: 0,
            productName: "FIT Cookbook",
            serialNumber: 1234,
            softwareVersion: 12.34,
            timestamp: createdTimestamp,
        });
        encoder.writeMesg(<any>{
            mesgNum: Profile.MesgNum.EVENT,
            timestamp: createdTimestamp,
            event: "timer",
            eventType: "start",
        });

        for(let record of records){
            encoder.writeMesg(<any>{
                ...record,
                mesgNum: Profile.MesgNum.RECORD!,
                positionLat: record.positionLat !== undefined ? record.positionLat * semicirclesPerDegree : undefined,
                positionLong: record.positionLong !== undefined ? record.positionLong * semicirclesPerDegree : undefined,
                activityId: undefined
            })
        }

        encoder.writeMesg(<any>{
            mesgNum: Profile.MesgNum.EVENT,
            timestamp: this.finishDate,
            event: "timer",
            eventType: "stop",
        });

            // Every FIT ACTIVITY file MUST contain at least one Lap message
        encoder.writeMesg(<any>{
            mesgNum: Profile.MesgNum.LAP,
            messageIndex: 0,
            timestamp: this.finishDate,
            startTime: this.startDate,

            totalElapsedTime: this.elapsed,
            totalTimerTime: this.totalTime,
        });

        // Every FIT ACTIVITY file MUST contain at least one Session message
        encoder.writeMesg(<any>{
            mesgNum: Profile.MesgNum.SESSION,
            messageIndex: 0,
            timestamp: this.finishDate,
            startTime: this.startDate,
            totalElapsedTime: this.elapsed,
            totalTimerTime: this.totalTime,
            totalDistance: this.distance,
            sport: sportType,
            subSport: subSportType,
            firstLapIndex: 0,
            numLaps: 1,
        });

        // Every FIT ACTIVITY file MUST contain EXACTLY one Activity message
        encoder.writeMesg(<any>{
            mesgNum: Profile.MesgNum.ACTIVITY,
            timestamp: this.finishDate,
            //localTimestamp: activity.finishDate + (new Date()).getTimezoneOffset()*-60,
            numSessions: 1,
            totalTimerTime: this.totalTime,
        });

        return encoder.close();
    }
}