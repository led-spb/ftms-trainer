<script setup lang="ts">
    import { ref, computed } from 'vue';
    import { useRouter } from 'vue-router';
    import { useActivityStore, useRoutesStore } from '@/stores';
    import { Route } from '@/lib/geo';
    import { LMap, LPolyline, LTileLayer} from "@vue-leaflet/vue-leaflet";

    const router = useRouter()
    const activity = useActivityStore()
    const routeStore = useRoutesStore()

    const debugMode = computed(() => import.meta.env.DEV)

    const displayRoute = ref(false)
    const reverse = ref(false)

    const routes = computed( () => {
        return routeStore.routes.map( item => {
            return Object.assign(
                Object.create(Object.getPrototypeOf(item), Object.getOwnPropertyDescriptors(item)),
                {latlngs:  item.waypoints.map(point => [point.latitude, point.longitude])}
            )
        })
    })

    const followRouteClick = () => {
        displayRoute.value = !displayRoute.value
        if( !displayRoute.value ){
            routeStore.activeRoute = undefined
        }
    }

    const goFreeRide = () => {
        activity.route = undefined
        router.push({name: 'ride'})
    }

    const goRouteRide = (route: Route) => {
        activity.route = route
        router.push({name: 'ride'})
    }

    const fitMapBounds = (map: any, route: any) => {
        map.fitBounds(route.latlngs, {padding: [20, 20], maxZoom: 16})
    }
</script>


<template>
    <UContainer>
        <div class="flex items-center justify-center">
            <UButton icon="i-lucide-bike" variant="outline" size="xl" class="mr-6" @click="goFreeRide()">Free ride</UButton>
            <UButton icon="i-lucide-route" :variant="displayRoute ? 'solid': 'outline'" size="xl" @click="followRouteClick">Route</UButton>
        </div>
        <div class="mt-4" v-if="displayRoute">
            <UCarousel arrows dots v-slot="{ item }" :items="routes" @select="(index) => routeStore.activeRoute = routeStore.routes.at(index)">
                <UForm>
                    <UFormField label="Name" orientation="horizontal" class="mb-1 font-bold">{{ item.name }}</UFormField>
                    <UFormField label="Distance" orientation="horizontal" class="mb-1">{{ (item.distance/1000).toFixed(1) }} km</UFormField>
                    <UFormField label="Climb" orientation="horizontal" class="mb-1"> {{ item.climb.toFixed(0) }} m</UFormField>
                </UForm>

                <div style="width: 100%; height: 50vh;">
                    <LMap :center="item.latlngs.at(0)" 
                        :bounds="item.latlngs"
                        :zoom="14"
                        @ready="(layer) => fitMapBounds(layer, item)"
                        :options="{zoomControl: false, attributionControl: false, dragging: false, keyboard: false, touchZoom: false, scrollWheelZoom: false, doubleClickZoom: false}">
                        <LTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" layer-type="base" name="OpenStreetMap"/>
                        <LPolyline color="red" :lat-lngs="item.latlngs"/>
                    </LMap>
                </div>
            </UCarousel>

            <div class="flex items-center justify-center mt-10">
                <UButton class="mr-2" variant="outline" :disabled="!routeStore.activeRoute" @click="router.push({name: 'edit'})" v-if="debugMode">Edit</UButton>
                <UButton variant="outline" :disabled="!routeStore.activeRoute" @click="goRouteRide(routeStore.activeRoute!)">Go ride</UButton>
                <USwitch class="ml-2" label="Reverse" v-model="reverse"/>
            </div>
        </div>
        
    </UContainer>

</template>