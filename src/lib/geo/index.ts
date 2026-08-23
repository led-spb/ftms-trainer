export interface GeoPoint {
    distance: number
    latitude: number
    longitude: number
    altitude: number
    grade?: number
}

export interface IRoute {
    name: string
    distance: number
    waypoints: GeoPoint[]
}

export const ROUTE_STEP_METERS = 50
export class Route implements IRoute {
    name: string
    waypoints: GeoPoint[]

    public get distance(): number {
        return this.waypoints.at(-1)?.distance ?? 0
    }

    public get climb(): number {
        return this.waypoints.reduce((agg, current, index) => {
            if( index > 0 && this.waypoints[index-1]?.altitude && current.altitude ){
                if( current.altitude - this.waypoints[index-1]?.altitude! > 0)
                    return agg + current.altitude - this.waypoints[index-1]?.altitude!
            }
            return agg
        }, 0 )
    }

    constructor(name: string, waypoints :GeoPoint[]) {
        this.name = name
        this.waypoints = waypoints
    }

    public geoPointByDistance(distance :number): GeoPoint|undefined {
        if( this.waypoints.length == 0 )
            return undefined

        const currIndex = Math.min(Math.trunc(distance/ROUTE_STEP_METERS), this.waypoints.length-1)
        const nextIndex = Math.min(currIndex+1, this.waypoints.length-1)
        const next2Index = Math.min(currIndex+2, this.waypoints.length-1)

        const current = this.waypoints[currIndex]!
        const next = this.waypoints[nextIndex]!
        const next2 = this.waypoints[next2Index]!

        if( next.distance - current.distance == 0)
            return {...current, distance, grade: 0}

        const gradeA = (next.altitude - current.altitude) / ROUTE_STEP_METERS * 100
        const gradeB = (next2.altitude - next.altitude) / ROUTE_STEP_METERS * 100

        // linear interpolate
        const progress = (distance - current.distance) / ROUTE_STEP_METERS

        const latitude = current.latitude + (next.latitude-current.latitude)*progress
        const longitude = current.longitude + (next.longitude-current.longitude)*progress
        const altitude = current.altitude + (next.altitude-current.altitude)*progress

        const grade = (gradeA + (gradeB-gradeA)*progress)
        
        return {longitude, latitude, distance, altitude, grade}
    }
}
