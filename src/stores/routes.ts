import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { Route, type IRoute } from '@/lib/geo'

const ALTITUDE_MOVING_AVERAGE_POINTS = 2;

export const useRoutesStore = defineStore('routes', () => {
    const activeRoute = ref<Route>();

    const routes = ref<Route[]>([]);

    Object.values(
        import.meta.glob('@/assets/routes/*.ts', {})
    ).map(
        (loader) => {
            loader().then((module: any) => {
                const route = module.default as IRoute

                route.waypoints.reduce(
                    (acc, current) => {
                        acc.push(current.altitude)
                        if( acc.length >= ALTITUDE_MOVING_AVERAGE_POINTS ){
                            const total = acc.reduce( (acc, x) => acc + x )
                            current.altitude = total / acc.length
                            acc.splice(0, 1)
                        }
                        return acc
                    },
                    <number[]>[]
                )

                routes.value.push(
                    new Route(route.name, route.waypoints)
                )
            } )
        }
    )

    return { routes: computed(() => {
        const array = [...routes.value];
        array.sort( ( a:Route, b :Route) => a.name.localeCompare(b.name) )
        return array
    }), activeRoute}
})