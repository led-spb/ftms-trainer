<script setup lang="ts">
    import { ref, computed } from 'vue';
    import { useRouter } from 'vue-router';
    import { useActivityStore, useRoutesStore } from '@/stores';
    import type { Route } from '@/stores/routes';
    import { FollowPathStrategy, NullPathStrategy } from '@/lib/geo';
    import {LMap, LPolyline, LTileLayer} from "@vue-leaflet/vue-leaflet";

    const router = useRouter()
    const activity = useActivityStore()
    const routeStore = useRoutesStore()

    const debugMode = computed(() => import.meta.env.DEV)
    const fitFile = ref()

    const displayFollowState = ref(false)
    const reverse = ref(false)

    const routes = computed( () => {
        return routeStore.routes.map( route => {
            return {...route, latlngs: route.waypoints.map(point => [point.latitude, point.longitude]) }
        })
    })

    const climb = (route: Route) => {
        return route.waypoints.reduce( (total, curr, index) => {
            if( index > 0 ){
                const prev = route.waypoints.at(index-1)!
                if( prev.altitude != null && curr.altitude != null){
                    const delta = curr.altitude - prev.altitude
                    if( delta > 0 ){
                        return total + delta
                    }
                }
            }
            return total
        }, 0 )
    }

    const followRouteClick = () => {
        displayFollowState.value = !displayFollowState.value
        if( !displayFollowState.value ){
            routeStore.activeRoute = undefined
        }
    }

    const goFreeRide = () => {
        activity.setGeoPathStrategy(new NullPathStrategy())
        router.push({name: 'ride'})
    }

    const goRouteRide = (route: Route) => {
        const path = new FollowPathStrategy()
        path.setFollowPathPoints(route.waypoints, reverse.value)

        activity.setGeoPathStrategy(path)
        router.push({name: 'ride'})
    }

    const loadFitFile = async() => {
        await routeStore.loadRouteFromFile(fitFile.value)
    }

    const onMapReady = async (map: any, route: any) => {
        map.fitBounds(route.latlngs, {padding: [20, 20], maxZoom: 16})
    }
</script>


<template>
    <UContainer>
        <div class="flex items-center justify-center">
            <UButton icon="i-lucide-bike" variant="outline" size="xl" class="mr-6" @click="goFreeRide()">Free ride</UButton>
            <UButton icon="i-lucide-route" :variant="displayFollowState ? 'solid': 'outline'" size="xl" @click="followRouteClick">Route</UButton>
        </div>
        <div class="mt-4" v-if="displayFollowState">
            <UCarousel arrows dots v-slot="{ item }" :items="routes" @select="(index) => routeStore.activeRoute = routeStore.routes.at(index)">
                <UForm>
                    <UFormField label="Name" orientation="horizontal" class="mb-1 font-bold">{{ item.name }}</UFormField>
                    <UFormField label="Distance" orientation="horizontal" class="mb-1">{{ (item.distance/1000).toFixed(1) }} km</UFormField>
                    <UFormField label="Climb" orientation="horizontal" class="mb-1"> {{ climb(item).toFixed(0) }} m</UFormField>
                </UForm>

                <div style="width: 100%; height: 50vh;">
                    <LMap :center="item.latlngs.at(0)" :zoom="14" @ready="(layer) => onMapReady(layer, item)" 
                        :options="{zoomControl: false, attributionControl: false, dragging: false, keyboard: false, touchZoom: false, scrollWheelZoom: false, doubleClickZoom: false}">
                        <LTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" layer-type="base" name="OpenStreetMap"/>
                        <LPolyline color="red" :lat-lngs="item.latlngs"/>
                    </LMap>
                </div>
            </UCarousel>

            <div class="flex items-center justify-center mt-10">
                <UFileUpload class="mr-2" v-on:change="loadFitFile()" v-model="fitFile" variant="button" label="Load from .fit"></UFileUpload>
                <UButton class="mr-2" variant="outline" :disabled="!routeStore.activeRoute" @click="router.push({name: 'edit'})" v-if="debugMode">Edit</UButton>
                <UButton variant="outline" :disabled="!routeStore.activeRoute" @click="goRouteRide(routeStore.activeRoute!)">Go ride</UButton>
                <USwitch class="ml-2" label="Reverse" v-model="reverse"/>
            </div>
        </div>
        
    </UContainer>

</template>