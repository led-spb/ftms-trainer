import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { GeoPoint } from '@/lib/geo'
import { FitDecoder } from '@/lib/fit'


export interface Route {
    name: string,
    distance: number,
    waypoints: GeoPoint[]
}

export const useRoutesStore = defineStore('routes', () => {
    const activeRoute = ref<Route|undefined>();

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
            distance: waypoints.slice(-1).pop()?.distance ?? 0,
            waypoints: waypoints,
        }
    }

    const routes_data = ref<Route[]>([])
    import('@/assets/data').then(module => { routes_data.value = module.default })

    const routes = computed<Route[]>(() => routes_data.value as Route[])

    return { routes, activeRoute, loadRouteFromFile }
})