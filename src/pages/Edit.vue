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

    const exportRoute = () => {
        console.log(
            JSON.stringify(
                chartData.value.map( (item) => {
                    return {...item.data, altitude: item.y, grade: undefined}
                })
            )
        )
    }

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
        <UButton class="ml-4" variant="outline" @click="exportRoute()">Export</UButton>
        <USlider class="mt-4"></USlider>
        <Scatter ref="chart" class="mt-4" :data="altitudeChartData" :options="(altitudeChartOptions as any)" v-if="routes.activeRoute"></Scatter>
    </UContainer>
</template>