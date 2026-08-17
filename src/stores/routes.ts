import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { FollowPathStrategy, type GeoPoint } from '@/lib/geo'
import { FitDecoder } from '@/lib/fit'


export interface Route {
    name: string,
    distance: number,
    waypoints: GeoPoint[]
}

export const useRoutesStore = defineStore('routes', () => {
    const activeRoute = ref<Route|undefined>();

    const step = ref(50);

    async function loadRouteFromFile(file: File){
        const decoder = new FitDecoder()
        decoder.import(await file.arrayBuffer())

        const waypoints = decoder.getRecords().map( item => {
            return {
                latitude: item.positionLat || 0,
                longitude: item.positionLong || 0,
                distance: item.distance || 0,
                altitude: item.enhancedAltitude
            }
        })

        activeRoute.value = {
            name: file.name,
            distance: waypoints.at(-1)?.distance ?? 0,
            waypoints: waypoints,
        }
    }

    const routes_data = ref<Route[]>([])
    import('@/assets/data').then(module => { routes_data.value = module.default })

    const routes = computed<Route[]>(() => {
        const strategy = new FollowPathStrategy()

        return routes_data.value.map((route) => {
            strategy.setFollowPathPoints(route.waypoints);

            const newPoints = []
            for(let dist=0; dist<=route.distance; dist+=step.value){
                newPoints.push(strategy.geoPointByDistance(dist)!)
            }
            // moving average
            newPoints.reduce( (acc, current) => {
                acc.push(current.altitude!)
                if( acc.length >=2 ){
                    const total = acc.reduce( (acc, x) => acc + x )
                    current.altitude = total / acc.length
                    acc.splice(0, 1)
                }

                return acc
            }, <number[]>[])

            return {...route, waypoints: newPoints}
        })
    })

    return { routes, step, activeRoute, loadRouteFromFile }
})