<script setup lang="ts">
  import { useTrainerStore, useHeartStore, useActivityStore } from '@/stores';
  import { computed, watch } from 'vue'
  import { WakeLockManager } from '@/lib/wake';

  import {type ChartData} from 'chart.js/auto';
  import {Scatter} from 'vue-chartjs';

  import {LMap, LPolyline, LTileLayer, LCircleMarker, LMarker} from "@vue-leaflet/vue-leaflet";

  const trainer = useTrainerStore()
  const heart = useHeartStore()

  const activity = useActivityStore()

  activity.attachSensors(
    computed(() => trainer.speed ?? 0),
    computed(() => trainer.power),
    computed(() => trainer.cadence),
    computed(() => heart.heartRate),
    computed({
        get: () => trainer.grade,
        set: (value: number) => { trainer.grade = value }
    })
  )

  const toastManager = useToast()
  const isDebug = computed(() => import.meta.env.DEV)


  const altitudeChartData = computed<any>(() => {
    return {
      datasets: [
        {
          data: [{x: activity.distance/1000, y: activity.altitude}],
          showLine: false,
          pointStyle: 'circle', pointRadius: 5,
          animation: false,
          pointBackgroundColor: 'red'
        },
        {
          data: activity.waypoints.map( point => {return {x: point.distance/1000, y: point.altitude}} ),
          showLine: true,
          tension: 0.3,
          pointStyle: false,
          borderColor: 'rgba(54, 162, 235, 1)',
          animation: false,
        },
      ]
    }
  })

  const activityTrackLine = computed(
    () => activity.waypoints.map(point => [point.latitude, point.longitude])
  )

  const chartBounds = (distance : number, total: number) => {
    const pos = Math.trunc(distance/500)/2;
    const max = Math.trunc(total/500)/2
    if( pos <= 1){
      return {min: 0, max: 4}
    }
    if( pos >= max-3){
      return {min: max-4, max: max }
    }
    return {min: pos-1, max: pos+3 }
  }

  const altitudeChartOptions = computed(() => {
    return {
      responsive: true,
      plugins: {
        legend: {display: false},
        tooltip: {enabled: false},
      },
      scales: {
        x: {...chartBounds(activity.distance, activity.route?.distance ?? 0), grid: {color: '#666'}},
        y: {
          suggestedMin: Math.min(...activity.waypoints.map((point) => {return point.altitude ?? 0})),
          suggestedMax: Math.max(...activity.waypoints.map((point) => {return point.altitude ?? 0})),
          grid: {
            color: '#666'
          },        
        },
      }
    }
  })

  const connectDevice = async (device: any) => {
    try{
      await device.selectDevice()
    }catch(error: Error|any) {
      console.error(error)
      toastManager.add({
        title: "Device connection error",
        description: `${error.name}: ${error.message}`,
        color: "error",
      })
    }
  }

  const startActitvitySession = () => {
    activity.startActivity()
    WakeLockManager.requestLock()
  }

  const stopActivitySession = () => {
    activity.stopActivity()
    WakeLockManager.releaseLock()
  }

  const exportActivityData = () => {
    const blob = new Blob([activity.activityFitData?.buffer as ArrayBuffer], { type: 'application/octetstream' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-${(new Date()).toISOString().replaceAll(/[-.:Z]/g,'')}.fit`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  watch(() => heart.batteryLevel, (value) => {
    if( value != null ){
      toastManager.add({
        title: 'Battery level',
        description: `${heart.deviceName} battery is ${value}%`,
        color: value >= 50 ? "success" : value >= 20 ? "warning" : "error",
      })
    }
  })

</script>

<template>
  <UContainer>
    <div class="flex justify-center mb-4 full-w">
      <UButton variant="outline" class="mr-2 text-lg" loading-auto @click="connectDevice(trainer)" :disabled="trainer.isConnected">
        <template v-if="trainer.isConnected">{{ trainer.deviceName }}</template>
        <template v-else>Trainer</template>
      </UButton>

      <UButton variant="outline" class="mr-2 text-lg" loading-auto @click="connectDevice(heart)" :disabled="heart.isConnected">
        <template v-if="heart.isConnected">{{ heart.deviceName }}</template>
        <template v-else>HRM</template>
      </UButton>

      <UButton variant="outline" class="mr-2 text-lg" @click="startActitvitySession()" :disabled="!trainer.isConnected && !isDebug" v-if="!activity.isStarted">Start</UButton>
      <UButton variant="outline" class="mr-2 text-lg" @click="stopActivitySession()" color="warning" v-if="activity.isStarted">Stop</UButton>
      <UButton variant="outline" class="mr-2 text-lg" @click="exportActivityData()" v-if="!activity.isStarted && activity.activityFitData">Download</UButton>
    </div>

    <UForm class="mb-6">
      <UFormField class="text-3xl mb-1" label="Speed" orientation="horizontal" v-if="trainer.speed != null || isDebug">
         {{ trainer.speed != null ? trainer.speed.toFixed(1) : 'n/a' }} km/h
      </UFormField>
      <UFormField class="text-3xl mb-1" label="Power" orientation="horizontal" v-if="trainer.power != null || isDebug" >
        {{ trainer.power != null  ? trainer.power.toFixed(0) : 'n/a'}} wt
      </UFormField>
      <UFormField class="text-3xl mb-1" label="Heart rate" orientation="horizontal" v-if="heart.heartRate != null || isDebug">
        {{ heart.heartRate != null  ? heart.heartRate.toFixed(0) : 'n/a' }} bpm
      </UFormField>
      <UFormField class="text-3xl mb-1" label="Grade" orientation="horizontal" v-if="trainer.isConnected || isDebug">
        <UButton variant="outline" icon="i-lucide-plus" size="lg" class="mr-2" @click="trainer.grade += 0.1" v-if="activity.waypoints.length == 0"></UButton>
        {{ trainer.grade.toFixed(1) }} %
        <UButton variant="outline" icon="i-lucide-minus" size="lg" class="ml-2" @click="trainer.grade -= 0.1" v-if="activity.waypoints.length == 0"></UButton>
      </UFormField>
    </UForm>

    <UForm>
      <UFormField label="Distance" orientation="horizontal" class="text-4xl mb-1">
        {{ (activity.distance/1000).toFixed(2) }} km
      </UFormField>

      <UFormField label="Time" orientation="horizontal" class="text-4xl mb-1">
        {{ Math.trunc(activity.elapsed/3600).toString().padStart(2, '0') }}:{{ (Math.trunc(activity.elapsed/60)%60).toString().padStart(2, '0') }}:{{ Math.trunc(activity.elapsed%60).toString().padStart(2, '0') }}
      </UFormField>
    </UForm>
  </UContainer>

  <UContainer class="mt-4" v-if="activity.route != undefined">
    <USlider class="mb-4" v-model="activity.distance" :max="activity.waypoints.at(-1)?.distance ?? 0" :disabled="!isDebug"></USlider>
    <Scatter :data="altitudeChartData" :options="altitudeChartOptions"></Scatter>
  </UContainer>

  <UContainer class="mt-4">
    <div style="height: 26vh; width:100%" v-if="activity.route != undefined">
      <LMap :center="[activity.latitude, activity.longitude]" :zoom="14">
        <LTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" layer-type="base" name="OpenStreetMap"/>
        <LPolyline color="red" :lat-lngs="activityTrackLine"/>
        <LCircleMarker :lat-lng="[activity.latitude, activity.longitude]" color="green" :radius="5" fill :fill-opacity="1" fill-color="green"/>
        <!-- <LMarker :lat-lng="[activity.latitude, activity.longitude]"/> -->
      </LMap>
    </div>
  </UContainer>

</template>
