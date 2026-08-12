<script setup lang="ts">
    import { ref, computed, watch, useTemplateRef, nextTick } from 'vue';
    import { useRouter } from 'vue-router';
    import { useActivityStore, useRoutesStore } from '@/stores';
    import type { Route } from '@/stores/routes';
    import { type GeoPoint, FollowPathStrategy, NullPathStrategy } from '@/lib/geo';
    import {LMap, LPolyline, LTileLayer} from "@vue-leaflet/vue-leaflet";

    const router = useRouter()
    const activity = useActivityStore()
    const routes = useRoutesStore()
    const mapObject = useTemplateRef('map');
    const polyLineObject = useTemplateRef('polyline');


    const fitFile = ref()

    const displayFollowState = ref(false)
    const selectedRoute = ref<Route>()
    const routesList = computed(() => routes.routes.map(item => {
            return {
                label: item.name,
                description: `Distance: ${(item.distance/1000).toFixed(1)} km`,
                value: item,
            }
        })
    )
    const routeTrackPoints = computed(() => selectedRoute.value?.waypoints.map( item => [item.latitude, item.longitude]))

    const zoomToPolyline = async () => {
        await nextTick();

        const map = mapObject.value?.leafletObject;
        const polyline = polyLineObject.value?.leafletObject;

        if (map && polyline) {
            const bounds = polyline.getBounds();
            map.fitBounds(bounds, {padding: [50, 50], maxZoom: 16});
        }
    }

    const followRouteClick = () => {
        displayFollowState.value = !displayFollowState.value
        if( !displayFollowState.value ){
            selectedRoute.value = undefined
        }
    }

    const goFreeRide = () => {
        activity.setGeoPathStrategy(new NullPathStrategy())
        router.push({name: 'ride'})
    }

    const goRouteRide = (waypoints: GeoPoint[]|undefined) => {
        if( waypoints ){
            const path = new FollowPathStrategy()
            path.setFollowPathPoints(waypoints)

            activity.setGeoPathStrategy(path)
            router.push({name: 'ride'})
        }
    }

    const loadFitFile = async() => {
        selectedRoute.value = await routes.loadRouteFromFile(fitFile.value)
    }
</script>


<template>
    <UContainer>
        <div class="flex items-center justify-center">
            <UButton icon="i-lucide-bike" variant="outline" size="xl" class="mr-6" @click="goFreeRide()">Free ride</UButton>
            <UButton icon="i-lucide-route" :variant="displayFollowState ? 'solid': 'outline'" size="xl" @click="followRouteClick">Route</UButton>
        </div>
        <div v-if="displayFollowState">
            <UListbox v-model="selectedRoute" value-key="value" :items="routesList" class="mt-4" size="xl"/>
            <div class="flex items-center justify-center mt-4">
                <UFileUpload class="mr-2" v-on:change="loadFitFile()" v-model="fitFile" variant="button" label="Load from .fit"></UFileUpload>
                <UButton variant="outline" :disabled="!selectedRoute" @click="goRouteRide(selectedRoute?.waypoints)">Go ride</UButton>
            </div>
        </div>
    </UContainer>

    <UContainer class="mt-4" v-if="selectedRoute">
        <div style="width: 100%; height: 50vh;">
            <LMap ref="map" :center="[0, 0]" :zoom="14">
                <LTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" layer-type="base" name="OpenStreetMap"/>
                <LPolyline ref="polyline" color="red" :lat-lngs="routeTrackPoints!" @vue:updated="zoomToPolyline"/>
            </LMap>        
        </div>
    </UContainer>
</template>