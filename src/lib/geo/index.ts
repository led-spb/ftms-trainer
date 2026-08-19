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

const ROUTE_STEP_METERS = 50
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

/*
export interface GeoPathStrategy {
    geoPointByDistance(distance: number): GeoPoint|null;
    waypoints(): GeoPoint[];
}

const degreesPerMeter = 1 / 111000;

export class LinePathStrategy implements GeoPathStrategy {
    private startPoint: GeoPoint;

    constructor (){
        this.startPoint = {latitude: 0, longitude: 0, altitude: 0, distance: 0}
    }

    public waypoints(): GeoPoint[]{
        return []
    }

    public geoPointByDistance(distance: number): GeoPoint {
        return {
            latitude: this.startPoint.latitude,
            longitude: this.startPoint.longitude + distance*degreesPerMeter,
            altitude: this.startPoint.altitude,
            distance
        }
    }
}

export class NullPathStrategy implements GeoPathStrategy{
    geoPointByDistance(distance: number): GeoPoint|null {
        return null
    }

    public waypoints(): GeoPoint[]{
        return []
    }
}

export class FollowPathStrategy implements GeoPathStrategy {
    private targetPoints: GeoPoint[]

    constructor (){
        this.targetPoints = [];
    }

    public setFollowPathPoints(points: GeoPoint[], reverse: boolean = false){
        let data = points.filter((item, index) => {
            if( index < points.length-1 && item.distance == points[index+1]?.distance)
                return false
            return true
        })
        const totalDistance = data.at(-1)?.distance??0
        if( reverse ){
            data.reverse()
            data = data.map(point => { return {...point, distance: totalDistance-point.distance}})
        }

        data.reduceRight(
            (next, current) => {
                if( next ){
                    const deltaDistance = Math.abs(next.distance - current.distance)
                    if( current.altitude == null )
                        current.altitude = next.altitude
                    if( next.altitude == null || current.altitude == null ){
                        current.grade = next.grade
                    }else{
                        current.grade = (next.altitude - current.altitude) / deltaDistance * 100
                    }
                }
                return current
            },
            data.at(-1)
        )

          this.targetPoints = data
    }

    private findClosest(distance :number): any[]{
        let left: number = 0;
        let right: number = this.targetPoints.length - 1;

        if( (this.targetPoints[left]?.distance || distance) > distance )
            return [this.targetPoints[left], this.targetPoints[left]]

        if( (this.targetPoints[right]?.distance || distance) < distance )
            return [this.targetPoints[right], this.targetPoints[right]]

        while( left <= right){
            const midIndex = Math.floor((left + right) / 2)
            const midPoint = this.targetPoints[midIndex]

            if( midPoint?.distance === distance) return [midPoint, midPoint]

            if( midPoint && midPoint.distance < distance ){
                left = midIndex + 1
            }else{
                right = midIndex - 1
            }
        }
        return [this.targetPoints[right], this.targetPoints[left]]
    }

    public geoPointByDistance(distance: number): GeoPoint|null {
        if( this.targetPoints.length == 0 )
            return null

        const nearestPoints = this.findClosest(distance)

        const pointA = nearestPoints[0]
        const pointB = nearestPoints[1]

        const hasCoorinates = pointA.latitude != null && pointB.latitude != null && pointA.longitude != null && pointB.longitude != null
        const hasAltitudes = pointA.altitude != null && pointB.altitude != null

        if( pointA.distance == pointB.distance )
            return pointA

        // linear interpolate
        const progress = (distance - pointA.distance)/(Math.abs(pointB.distance - pointA.distance))

        const latitude = hasCoorinates ? (pointA.latitude + (pointB.latitude-pointA.latitude)*progress) : undefined
        const longitude = hasCoorinates ? (pointA.longitude + (pointB.longitude-pointA.longitude)*progress) : undefined
        const altitude = hasAltitudes ? (pointA.altitude + (pointB.altitude-pointA.altitude)*progress) : undefined
        const grade = hasAltitudes ? (pointA.grade + (pointB.grade-pointA.grade)*progress) : undefined

        return {longitude, latitude, distance, altitude, grade}
    }

    public waypoints(): GeoPoint[]{
        return this.targetPoints
    }
}
*/