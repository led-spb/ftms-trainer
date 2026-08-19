<script setup lang="ts">
    import { ref, watch, computed, onMounted, useTemplateRef } from 'vue';
    import { useRoutesStore } from '@/stores';

    import {Chart} from 'chart.js/auto';
    import {Scatter} from 'vue-chartjs';
    import zoomPlugin from 'chartjs-plugin-zoom';
    import ChartJSDragDataPlugin from 'chartjs-plugin-dragdata';

    Chart.register(zoomPlugin);
    Chart.register(ChartJSDragDataPlugin);
    const routes = useRoutesStore()

    const fitFile = ref()
    const chart = useTemplateRef('chart')

    const chartData = ref<{x: number, y: number|undefined, data: any}[]>([]);

    watch(() => routes.activeRoute, 
        () => {
            if( routes.activeRoute ){
                chartData.value = routes.activeRoute.waypoints.map((item) => {return {x:item.distance, y:item.altitude, data: item }})
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

    const loadFitFile = async() => {
        // await routeStore.loadRouteFromFile(fitFile.value)
    }

    const exportRoute = computed( () => {
        return JSON.stringify(
                chartData.value.map( (item) => {
                    return {...item.data, altitude: item.y, grade: undefined}
                }), null, 2
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
        <UButton variant="outline" @click="(chart?.chart! as Chart).resetZoom()">Reset zoom</UButton>
        <UModal scrollable title="Export route">
            <UButton class="ml-4" variant="outline">Export</UButton>

            <template #body>
                <UTextarea :rows="12" v-model:model-value="exportRoute"/>
            </template>
        </UModal>
        <UFileUpload class="mr-2" v-on:change="loadFitFile()" v-model="fitFile" variant="button" label="Load from .fit"></UFileUpload>

        <USlider class="mt-4"></USlider>

        <Scatter ref="chart" class="mt-4" :data="altitudeChartData" :options="(altitudeChartOptions as any)"></Scatter>
    </UContainer>
</template>