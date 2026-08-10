export interface GeoPoint {
    latitude: number
    longitude: number
    distance: number
    altitude?: number
    grade?: number
}

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

    public setFollowPathPoints(points: GeoPoint[]){
        const data = points.filter((item, index) => {
            if( index < points.length-1 && item.distance == points[index+1]?.distance)
                return false
            return true
        })

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
            data.slice(-1).pop()
        )

        console.log(`followTrack loaded ${data.length} points`)
        console.log(JSON.stringify(data.map(item => { return {distance: item.distance, longitude: item.longitude, latitude: item.latitude, altitude: item.altitude}}) ))

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

        if( pointA.distance == pointB.distance )
            return pointA

        // linear interpolate 
        const progress = (distance - pointA.distance)/(Math.abs(pointB.distance - pointA.distance))

        const latitude = pointA.latitude + (pointB.latitude-pointA.latitude)*progress
        const longitude = pointA.longitude + (pointB.longitude-pointA.longitude)*progress
        const altitude = pointA.altitude + (pointB.altitude-pointA.altitude)*progress
        const grade = pointA.grade + (pointB.grade-pointA.grade)*progress

        return {longitude, latitude, distance, altitude, grade}
    }

    public waypoints(): GeoPoint[]{
        return this.targetPoints
    }
}
