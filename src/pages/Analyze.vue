<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { Decoder, Stream, Profile, Utils } from '@garmin/fitsdk';

  import Chart from 'chart.js/auto';
  import zoomPlugin from 'chartjs-plugin-zoom';
  Chart.register(zoomPlugin)
  
  import type { ChartData} from 'chart.js/auto';
  import {Scatter} from 'vue-chartjs';

  const fitFile = ref()
  const records = ref<[]>([]);

  const acvtivePosition = ref(0);

  const chartData = computed<ChartData<"scatter">>(() => {
    return {
      datasets: [ {
        data: records.value.map((item: any) => {return {x: item.distance, y :item.altitude}}),
        showLine: true,
        animation: false,
        tension: 0.1,
        pointStyle: false,
        borderColor: 'rgba(54, 162, 235, 1)',
        order: 1,
      },

      {
        data: records.value
                .filter( (item: any, index: number) => { return index == acvtivePosition.value })
                .map((item: any) => {return {x: item.distance, y :item.altitude}} ),
        showLine: false,
        pointStyle: 'circle',
        pointRadius: 5,
        pointBackgroundColor: 'red',
        pointBorderColor: 'red',
        animation: false,
        order: 2,
      },

      {
        data: records.value.map((item: any) => {return {x: item.distance, y :item.grade}}),
        showLine: true,
        animation: false,
        tension: 0.1,
        pointStyle: false,
        borderColor: 'green',
      }
    ]
    }
  })

  const chartOptions: any = {
    responsive: true,
    plugins: {
      legend: {display: false},
      zoom: {
        pan: {
          enabled: true,
          modifierKey: 'ctrl',
        },
        zoom: {
          drag: {
            enabled: true,
          },
          mode: 'x',  
        }
      },
    },
    scales: {
      x: {type: 'linear'}
    }
  }

  async function onFileUploaded(){
    console.log(`file ${fitFile.value.name} uploaded`, fitFile.value)
    const file: File = fitFile.value

    const stream = Stream.fromArrayBuffer(await file.arrayBuffer())

    const decoder = new Decoder(stream);
    console.log("isFIT (instance method): " + decoder.isFIT());
    console.log("checkIntegrity: " + decoder.checkIntegrity());


    const { messages, errors } = decoder.read();
    const rawRecords = messages.recordMesgs;

    const reducedRecords = rawRecords?.filter(
      (item, index) => { return index == 0 || rawRecords[index-1]?.distance !== item.distance }
    )

    // calculate grades
    records.value = reducedRecords?.map((item, index) => {
        let grade = 0;
        if( index < reducedRecords.length-1 && item.altitude != null){
          const nextItem = reducedRecords[index+1]
          const deltaDistance = (nextItem?.distance || 0) - (item.distance || 0)
          const deltaAltitude = (nextItem?.altitude || item.altitude || 0) - (item.altitude || 0)

          grade = deltaDistance > 0 ? (deltaAltitude / deltaDistance) * 100 : 0;
        }
        return {...item, grade}
    }) as []

    console.log((records.value as any[]).map((item) => {return {distance: item.distance, altitude: item.altitude, grade: item.grade}}) )
  }
</script>

<template>
  <UContainer>
    <UFileUpload v-model="fitFile" v-on:change="onFileUploaded()" label="Drop your activity here"  description="FIT (max. 2MB)"/>
    <USlider v-model="acvtivePosition" :max="records.length"></USlider>
  </UContainer>
  <UContainer>
    <Scatter :data="chartData" :options="chartOptions"></Scatter>
  </UContainer>
</template>
