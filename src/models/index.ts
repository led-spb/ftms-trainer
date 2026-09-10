import {type RecordMesg} from '@garmin/fitsdk';

interface GeoPoint {
    distance: number
    latitude: number
    longitude: number
    altitude: number
    grade?: number
}

interface IRoute {
    id: number
    name: string
    waypoints: GeoPoint[]
}


interface IActivity {
    id?: number,
    startDate?: Date,
    finishDate?: Date,
    distance: number,
    elapsed: number,
    latitude?: number,
    longitude?: number,
    altitude?: number,
};

interface IActivityRecord extends RecordMesg {
    activityId: number
}

export type { IActivity, IActivityRecord, GeoPoint, IRoute }
