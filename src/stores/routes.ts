import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { GeoPoint } from '@/lib/geo'
import { FitDecoder } from '@/lib/fit'

import routes_data from '@/assets/data' 

export interface Route {
    name: string,
    distance: number,
    waypoints: GeoPoint[]
}

export const useRoutesStore = defineStore('routes', () => {

    async function loadRouteFromFile(file: File): Promise<Route>{
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

        return {
            name: file.name,
            distance: waypoints.slice(-1).pop()?.distance ?? 0,
            waypoints: waypoints,
        }
    }

    const routes = computed<Route[]>(() => routes_data as Route[])

    return { routes, loadRouteFromFile }
})