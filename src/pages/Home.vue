<script setup lang="ts">
    import { ref, computed, watch } from 'vue';
    import { useRouter } from 'vue-router';
    import { useRecorderStore, useRoutesStore } from '@/stores';
    import { Route } from '@/lib/geo';
    import { LMap, LPolyline, LTileLayer} from "@vue-leaflet/vue-leaflet";

    const router = useRouter()
    const recorder = useRecorderStore()
    const routesStore = useRoutesStore()
    const selectedRouteIndex = ref(0)

    const debugMode = computed(() => import.meta.env.DEV)

    const displayRoute = ref(false)
    const reverse = ref(false)

    const routes = computed( () => {
        return routesStore.routes.map( item => {
            return Object.assign(
                Object.create(Object.getPrototypeOf(item), Object.getOwnPropertyDescriptors(item)),
                {latlngs:  item.waypoints.map(point => [point.latitude, point.longitude])}
            )
        })
    })

    const followRouteClick = () => {
        displayRoute.value = !displayRoute.value
        if( !displayRoute.value ){
            routesStore.activeRoute = undefined
        }
    }

    const goFreeRide = () => {
        recorder.activeRoute = undefined
        router.push({name: 'ride'})
    }

    const goRouteRide = (route: Route) => {
        recorder.activeRoute = route
        router.push({name: 'ride'})
    }

    const fitMapBounds = (map: any, route: any) => {
        map.fitBounds(route.latlngs, {padding: [20, 20], maxZoom: 16})
    }

    watch( () => recorder.activity, (value) => {
        if( value.id ){
            console.log('You have unfinished activity')
            router.push({name: 'ride'})
        }
    })
</script>


<template>
    <UContainer>
        <div class="flex items-center justify-center">
            <UButton icon="i-lucide-bike" variant="outline" size="xl" class="mr-6" @click="goFreeRide()">Free ride</UButton>
            <UButton icon="i-lucide-route" :variant="displayRoute ? 'solid': 'outline'" size="xl" @click="followRouteClick">Route</UButton>
        </div>
        <div class="mt-4" v-if="displayRoute">
            <UCarousel arrows dots loop v-slot="{ item }" :start-index="selectedRouteIndex" :items="routes" @select="(index: any) => {selectedRouteIndex=index; routesStore.activeRoute = routesStore.routes.at(index) }">
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
                <UButton class="mr-2" variant="outline" :disabled="!routesStore.activeRoute" @click="router.push({name: 'edit'})" v-if="debugMode">Edit</UButton>
                <UButton variant="outline" :disabled="!routesStore.activeRoute" @click="goRouteRide(routesStore.activeRoute!)">Go ride</UButton>
                <!-- <USwitch class="ml-2" label="Reverse" v-model="reverse"/> -->
            </div>
        </div>
        
    </UContainer>

</template>