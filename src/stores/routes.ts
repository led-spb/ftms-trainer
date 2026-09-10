import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import { Route } from '@/lib/geo';
import type {IRoute} from '@/models';
import type { GeoPoint } from '@/models';

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
                    (acc: number[], current :GeoPoint) => {
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
                    new Route(route.id, route.name, route.waypoints)
                )
            } )
        }
    )

    const sortedRoutes = computed<Route[]>(
        () => {
            const values = [...routes.value as Route[]]
            values.sort(
                (a: Route, b: Route) => a.id - b.id
            )
            return values
        }
    )

    return { routes: sortedRoutes, activeRoute}
})