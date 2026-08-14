<script setup lang="ts">
    import { ref, computed, useTemplateRef, nextTick } from 'vue';
    import { useRouter } from 'vue-router';
    import { useActivityStore, useRoutesStore } from '@/stores';
    import { FollowPathStrategy, NullPathStrategy } from '@/lib/geo';
    import {LMap, LPolyline, LTileLayer} from "@vue-leaflet/vue-leaflet";

    const router = useRouter()
    const activity = useActivityStore()
    const routes = useRoutesStore()
    const mapObject = useTemplateRef('map');
    const polyLineObject = useTemplateRef('polyline');

    const debugMode = computed(() => import.meta.env.DEV)
    const fitFile = ref()

    const displayFollowState = ref(false)
    const reverse = ref(false)

    const routesList = computed(() => routes.routes.map(item => {
            return {
                label: item.name,
                description: `Distance: ${(item.distance/1000).toFixed(1)} km`,
                value: item,
            }
        })
    )
    const routeTrackPoints = computed(() => routes.activeRoute?.waypoints.map( item => [item.latitude, item.longitude]))

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
            routes.activeRoute = undefined
        }
    }

    const goFreeRide = () => {
        activity.setGeoPathStrategy(new NullPathStrategy())
        router.push({name: 'ride'})
    }

    const goRouteRide = () => {
        if( routes.activeRoute ){
            const path = new FollowPathStrategy()
            path.setFollowPathPoints(routes.activeRoute.waypoints, reverse.value)

            activity.setGeoPathStrategy(path)
            router.push({name: 'ride'})
        }
    }

    const loadFitFile = async() => {
        await routes.loadRouteFromFile(fitFile.value)
    }
</script>


<template>
    <UContainer>
        <div class="flex items-center justify-center">
            <UButton icon="i-lucide-bike" variant="outline" size="xl" class="mr-6" @click="goFreeRide()">Free ride</UButton>
            <UButton icon="i-lucide-route" :variant="displayFollowState ? 'solid': 'outline'" size="xl" @click="followRouteClick">Route</UButton>
        </div>
        <div v-if="displayFollowState">
            <UListbox v-model="routes.activeRoute" value-key="value" :items="routesList" class="mt-4" size="xl"/>
            <div class="flex items-center justify-center mt-4">
                <UFileUpload class="mr-2" v-on:change="loadFitFile()" v-model="fitFile" variant="button" label="Load from .fit"></UFileUpload>
                <UButton class="mr-2" variant="outline" :disabled="!routes.activeRoute" @click="router.push({name: 'edit'})" v-if="debugMode">Edit</UButton>
                <UButton variant="outline" :disabled="!routes.activeRoute" @click="goRouteRide()">Go ride</UButton>
                <USwitch class="ml-2" label="Reverse" v-model="reverse"/>
            </div>
        </div>
    </UContainer>

    <UContainer class="mt-4" v-if="displayFollowState && routes.activeRoute">
        <div style="width: 100%; height: 50vh;">
            <LMap ref="map" :center="[0, 0]" :zoom="14">
                <LTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" layer-type="base" name="OpenStreetMap"/>
                <LPolyline ref="polyline" color="red" :lat-lngs="routeTrackPoints!" @vue:updated="zoomToPolyline"/>
            </LMap>        
        </div>
    </UContainer>
</template>