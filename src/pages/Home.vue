<script setup lang="ts">
    import { ref, computed } from 'vue';
    import { useRouter } from 'vue-router';
    import { useActivityStore, useRoutesStore } from '@/stores';
    import type { Route } from '@/stores/routes';
    import { type GeoPoint, FollowPathStrategy, NullPathStrategy } from '@/lib/geo';

    const router = useRouter()
    const activity = useActivityStore()
    const routes = useRoutesStore()

    const fitFile = ref()

    const displayFollowState = ref(false)
    const selectedRoute = ref<Route>()

    function goFreeRide() {
        activity.setGeoPathStrategy(new NullPathStrategy())
        router.push({name: 'ride'})
    }

    function goRouteRide(waypoints: GeoPoint[]|undefined){
        if( waypoints ){
            const path = new FollowPathStrategy()
            path.setFollowPathPoints(waypoints)

            activity.setGeoPathStrategy(path)
            router.push({name: 'ride'})
        }
    }

    const routesList = computed(() => {
        return routes.routes.map(item => {
            return {
                label: item.name,
                description: `Distance: ${(item.distance/1000).toFixed(1)} km`,
                value: item,
            }
        })
    })

    async function loadFitFile(){
        selectedRoute.value = await routes.loadRouteFromFile(fitFile.value)
    }
</script>


<template>
    <UContainer>
        <div class="flex items-center justify-center">
            <UButton icon="i-lucide-bike" variant="outline" size="xl" class="mr-6" @click="goFreeRide()">Free ride</UButton>
            <UButton icon="i-lucide-route" :variant="displayFollowState ? 'solid': 'outline'" size="xl" @click="displayFollowState = !displayFollowState">Route</UButton>
        </div>
        <div v-if="displayFollowState">
            <UListbox v-model="selectedRoute" value-key="value" :items="routesList" class="mt-4" size="xl"/>
            <div class="flex items-center justify-center mt-4">
                <UFileUpload class="mr-2" v-on:change="loadFitFile()" v-model="fitFile" variant="button" label="Load from .fit"></UFileUpload>
                <UButton variant="outline" :disabled="!selectedRoute" @click="goRouteRide(selectedRoute?.waypoints)">Go ride</UButton>
            </div>
        </div>
    </UContainer>
</template>