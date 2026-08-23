<script setup lang="ts">
    import { ref, watch, computed, onMounted, useTemplateRef } from 'vue';
    import { useRoutesStore } from '@/stores';

    import {Chart} from 'chart.js/auto';
    import {Scatter} from 'vue-chartjs';
    import zoomPlugin from 'chartjs-plugin-zoom';
    import ChartJSDragDataPlugin from 'chartjs-plugin-dragdata';
    import { FitDecoder } from '@/lib/fit';
    import { ROUTE_STEP_METERS, Route, type GeoPoint } from '@/lib/geo';

    Chart.register(zoomPlugin);
    Chart.register(ChartJSDragDataPlugin);
    const routeStore = useRoutesStore()

    const fitFile = ref()
    const chart = useTemplateRef('chart')

    const chartData = ref<{x: number, y: number|undefined, data: any}[]>([]);

    watch(() => routeStore.activeRoute, 
        () => {
            if( routeStore.activeRoute ){
                chartData.value = routeStore.activeRoute.waypoints.map((item) => {return {x:item.distance, y:item.altitude, data: item }})
            }
        },
        {immediate: true}
    )

    const altitudeChartData = computed<any>(() => {
        return {
        datasets: [
            {
                data: chartData.value,
                showLine: true,
                tension: 0.3,
                //pointStyle: false,
                borderColor: 'rgba(54, 162, 235, 1)',
                animation: false,
            },
        ]
        }
    })

    const loadFitFile = async(file: File) => {
        console.log(file.type)

        const decoder = new FitDecoder()
        decoder.import(await file.arrayBuffer())

        const data = decoder.getRecords().filter((item, index, arr) => {
            return index == 0 || arr[index-1]?.distance != item.distance
        })

        const points = <GeoPoint[]>[]
        let distance = 0;
        for (let index=0; index < data.length; index++) {
            if( data.at(index)?.distance! >= distance ){
                const current = data.at(index)!

                if( index == 0 ){
                    points.push({
                        distance,
                        latitude: current.positionLat ?? 0,
                        longitude: current.positionLong ?? 0,
                        altitude: current.altitude ?? 0,
                    })
                }else{
                    const prev = data.at(index-1)!

                    const progress = (prev.distance! - distance) / (current.distance! - prev.distance!)

                    points.push({
                        distance,
                        latitude: prev.positionLat!+(current.positionLat! - prev.positionLat!)*progress,
                        longitude: prev.positionLong!+(current.positionLong! - prev.positionLong!)*progress,
                        altitude: (prev.altitude??0) + ((current.altitude??0) - (prev.altitude??0))*progress,
                    })
                }               

                distance += ROUTE_STEP_METERS;
            }
        }

        const route = new Route(file.name, points)
        routeStore.activeRoute = route
    }

    const exportRoute = computed( () => {
        return JSON.stringify(
            {
                name: routeStore.activeRoute?.name,
                distance: 0,
                waypoints: chartData.value.map( (item) => {
                    return {...item.data, altitude: item.y, grade: undefined}
                })
            },
            null, 2
        )
    })

    const altitudeChartOptions = computed(() => {
        return {
        responsive: true,
        plugins: {
            legend: {display: false},
            zoom: {
                pan: {
                    enabled: true,
                    mode: 'x',
                    modifierKey: 'alt',
                },
                zoom: {
                    mode: 'x',
                    drag: {
                        enabled: true,
                        modifierKey: 'ctrl',
                    },                
                }
            },
        },
        scales: {
            x: {
            // min: Math.trunc(activity.distance/1000)-1,
            // max: Math.trunc(activity.distance/1000)+3,
            }
        }
        }
    });


    onMounted(() => {
        const myChart = chart.value?.chart! as Chart;
        myChart.canvas.addEventListener('dblclick', (e) => {
            const activePoints = myChart.getElementsAtEventForMode( e, 
                'nearest', 
                { intersect: true }, 
                false
            );
            if (activePoints.length > 0) {
                const point = activePoints[0];
                const dataIndex = point?.index;

                const tmpArray = [...chartData.value]
                tmpArray.splice(dataIndex!, 1)
                chartData.value = tmpArray
            }
        });
    })

</script>

<template>
    <UContainer class="mt-6">
        <UFileUpload accept=".fit,*.gpx" v-on:change="loadFitFile(fitFile)" v-model="fitFile" variant="button" label="Load from .fit"></UFileUpload>
        <UButton variant="outline" @click="(chart?.chart! as Chart).resetZoom()">Reset zoom</UButton>
        <UModal scrollable title="Export route">
            <UButton class="ml-4" variant="outline">Export</UButton>

            <template #body>
                <UTextarea :rows="12" v-model:model-value="exportRoute"/>
            </template>
        </UModal>

        <USlider class="mt-4"></USlider>

        <Scatter ref="chart" class="mt-4" :data="altitudeChartData" :options="(altitudeChartOptions as any)"></Scatter>
    </UContainer>
</template>