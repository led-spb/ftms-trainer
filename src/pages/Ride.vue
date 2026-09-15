<script setup lang="ts">
  import { useTrainerStore, useHeartStore, useRecorderStore } from '@/stores';
  import { computed, watch } from 'vue'
  import { WakeLockManager } from '@/lib/wake';
  import { formatDuration } from '@/lib/format';
  import { useToast } from '@nuxt/ui/runtime/composables/useToast.js';

  import {type ChartData} from 'chart.js/auto';
  import {Scatter} from 'vue-chartjs';

  import {LMap, LPolyline, LTileLayer, LCircleMarker, LMarker, LIcon} from "@vue-leaflet/vue-leaflet";

  import { useRouter } from 'vue-router';

  const router = useRouter()

  const trainer = useTrainerStore()
  const heart = useHeartStore()
  const recorder = useRecorderStore()

  recorder.attachSensors(
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
          data: [
            {
              x: (recorder.activeRoute?.distance ?? 0) ? (recorder.activity.distance % recorder.activeRoute!.distance)/1000 : recorder.activity.distance/1000,
              y: recorder.activity.altitude
            }
          ],
          showLine: false,
          pointStyle: 'circle', pointRadius: 5,
          animation: false,
          pointBackgroundColor: 'red'
        },
        {
          data: recorder.activeRoute?.waypoints.map( point => {return {x: point.distance/1000, y: point.altitude}} ),
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
    () => recorder.activeRoute ? recorder.activeRoute.waypoints.map(point => [point.latitude, point.longitude]) : []
  )

  const activityMarkers = computed(
    () => {
      const markers:any = [];
      for(let distance=2000; recorder.activeRoute && distance <= recorder.activeRoute?.distance; distance+=2000){
          const position = recorder.activeRoute.geoPointByDistance(distance);
          if( position ){
            markers.push({
              name: Math.trunc(distance/1000),
              pos: position,
            })
          }
        }
      return markers;
    }
  )

  const chartBounds = (distance : number, total: number) => {
    const pos = Math.trunc((distance % total)/500)/2;
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
        x: {...chartBounds(recorder.activity.distance, recorder.activeRoute?.distance ?? 0), grid: {color: '#666'}},
        y: {
          suggestedMin: Math.min(...(recorder.activeRoute?.waypoints ?? []).map((point) => {return point.altitude ?? 0})),
          suggestedMax: Math.max(...(recorder.activeRoute?.waypoints ?? []).map((point) => {return point.altitude ?? 0})),
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
    recorder.newActivity()
    resumeActivitySession()
  }

  const resumeActivitySession = () =>{
    recorder.startActivity()
    WakeLockManager.requestLock()
  }

  const pauseActivitySession = () => {
    recorder.pauseActivity()
    WakeLockManager.releaseLock()
  }

  const stopActivitySession = async () => {
    pauseActivitySession()
    await recorder.stopActivity()
    recorder.newActivity()
    router.push({name: 'activityList'})
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

      <UButton variant="outline" class="mr-2 text-lg" @click="startActitvitySession()" :disabled="!trainer.isConnected && !isDebug" v-if="!recorder.isStarted && recorder.activity.id == undefined">Start</UButton>
      <UButton variant="outline" class="mr-2 text-lg" @click="resumeActivitySession()" color="warning" :disabled="!trainer.isConnected && !isDebug" v-if="!recorder.isStarted && recorder.activity.id != undefined">Resume</UButton>
      <UButton variant="outline" class="mr-2 text-lg" @click="pauseActivitySession()" color="warning" v-if="recorder.isStarted">Pause</UButton>
      <UButton variant="outline" class="mr-2 text-lg" @click="stopActivitySession()" color="warning" v-if="!recorder.isStarted && recorder.activity.id !== undefined">Stop</UButton>
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
        <UButton variant="outline" icon="i-lucide-plus" size="lg" class="mr-2" @click="trainer.grade += 0.1" v-if="!recorder.activeRoute"></UButton>
        {{ trainer.grade.toFixed(1) }} %
        <UButton variant="outline" icon="i-lucide-minus" size="lg" class="ml-2" @click="trainer.grade -= 0.1" v-if="!recorder.activeRoute"></UButton>
      </UFormField>
    </UForm>

    <UForm>
      <UFormField label="Distance" orientation="horizontal" class="text-3xl mb-1">
        {{ (recorder.activity.distance/1000).toFixed(2) }} km
      </UFormField>

      <UFormField label="Time" orientation="horizontal" class="text-3xl mb-1">
        {{ formatDuration(recorder.activity.elapsed) }}
      </UFormField>
    </UForm>
  </UContainer>

  <UContainer class="mt-4" v-if="recorder.activeRoute != undefined">
     <UProgress :model-value="recorder.activity.distance % recorder.activeRoute.distance" :max="recorder.activeRoute.distance"></UProgress>
    <Scatter :data="altitudeChartData" :options="altitudeChartOptions"></Scatter>
  </UContainer>

  <UContainer class="mt-4">
    <div style="height: 26vh; width:100%" v-if="recorder.activeRoute != undefined">
      <LMap :center="[recorder.activity.latitude, recorder.activity.longitude]" :zoom="14">
        <LTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" layer-type="base" name="OpenStreetMap"/>
        <LPolyline color="red" :lat-lngs="activityTrackLine"/>
        
        <LMarker :lat-lng="[marker.pos.latitude, marker.pos.longitude]" v-for="marker in activityMarkers">
          <LIcon :icon-size="[24, 24]" :icon-anchor="[12, 12]" class-name="square-numbered-marker">
            <div class="square-box">{{ marker.name }}</div>
          </LIcon>
        </LMarker>

        <LCircleMarker :lat-lng="[recorder.activity.latitude, recorder.activity.longitude]" color="green" :radius="5" fill :fill-opacity="1" fill-color="green"/>
      </LMap>
    </div>
  </UContainer>

</template>

<style>
  .square-numbered-marker {
    background: transparent;
    border: none;
  }

  .square-box {
    width: 24px;
    height: 24px;
    background-color: #e63946;
    color: #ffffff;
    font-family: Arial, sans-serif;
    font-weight: bold;
    font-size: 10px;
    
    display: flex;
    align-items: center;
    justify-content: center;
    
    border: 2px solid #ffffff;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
  }
</style>