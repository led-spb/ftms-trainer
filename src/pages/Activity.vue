<script setup lang="ts">
  import { useTrainerStore, useHeartStore, useActivityStore } from '@/stores';
  import { ref, computed } from 'vue'
  import { FitDecoder } from '@/lib/fit';
  import { FollowPathStrategy, NullPathStrategy, type GeoPathStrategy } from '@/lib/geo';
  import { WakeLockManager } from '@/lib/wake';

  const trainer = useTrainerStore()
  const heart = useHeartStore()
  const activity = useActivityStore()
  const followFitFile = ref()

  const toastManager = useToast()
  const isDebug = computed(() => import.meta.env.DEV)
  const defaultGeoPathStrategy = new NullPathStrategy()

  let geoPathStrategy: GeoPathStrategy = defaultGeoPathStrategy

  async function connectDevice(device: any){
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

  function startActitvitySession(){
    const metrics = computed(() => { 
      return {
        speed: trainer.speed,
        power: trainer.power,
        cadence: trainer.cadence,
        grade: trainer.grade,
        heartRate: heart.heartRate
      }
    })

    const trainerGrade = computed({
      get: () => trainer.grade,
      set: (value) => trainer.grade = value
    })

    activity.startActivity(metrics, trainerGrade, geoPathStrategy)
    WakeLockManager.requestLock()
  }

  function stopActivitySession(){
    activity.stopActivity()
    WakeLockManager.releaseLock()
  }

  function exportActivityData(){
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

  async function loadFollowFile(){
    const file: File = followFitFile.value
    if( file == null ){
      geoPathStrategy = defaultGeoPathStrategy
      return
    }
    const decoder = new FitDecoder()
    decoder.import(await file.arrayBuffer())

    const strategy = new FollowPathStrategy()
    strategy.setFollowPathPoints(
      decoder.getRecords().map( item => {
        return {
          latitude: item.positionLat || 0,
          longitude: item.positionLong || 0,
          distance: item.distance || 0,
          altitude: item.enhancedAltitude
        }
      })
    )
    geoPathStrategy = strategy
  }
</script>

<template>
  <UContainer>
    <div class="flex justify-center mb-4 mt-4 full-w">
      <UButton variant="outline" class="mr-2 text-lg" loading-auto @click="connectDevice(trainer)" :disabled="trainer.isConnected"><template v-if="trainer.isConnected">{{ trainer.deviceName }}</template><template v-else>Trainer</template></UButton>
      <UButton variant="outline" class="mr-2 text-lg" loading-auto @click="connectDevice(heart)" :disabled="heart.isConnected"><template v-if="heart.isConnected">{{ heart.deviceName }}</template><template v-else>HRM</template></UButton>
      <UButton variant="outline" class="mr-2 text-lg" @click="startActitvitySession()" :disabled="!trainer.isConnected && !isDebug" v-if="!activity.isStarted">Start</UButton>
      <UButton variant="outline" class="mr-2 text-lg" @click="stopActivitySession()" color="warning" v-if="activity.isStarted">Stop</UButton>
      <UButton variant="outline" class="mr-2 text-lg" @click="exportActivityData()" v-if="!activity.isStarted && activity.activityFitData">Download</UButton>
      <UFileUpload variant="button" v-model="followFitFile" v-on:change="loadFollowFile()" ></UFileUpload>
    </div>

    <UForm class="mb-6">
      <UFormField class="text-3xl mb-1" label="Speed" orientation="horizontal" v-if="trainer.speed != null || isDebug">
        <div class="text-3xl">{{ trainer.speed != null ? trainer.speed.toFixed(1) : 'n/a' }} km/h</div>
      </UFormField>
      <UFormField class="text-3xl mb-1" label="Power" orientation="horizontal" v-if="trainer.power != null || isDebug" >
        <div class="text-3xl">{{ trainer.power != null  ? trainer.power.toFixed(0) : 'n/a'}} wt</div>
      </UFormField>
      <UFormField class="text-3xl mb-1" label="Heart rate" orientation="horizontal" v-if="heart.heartRate != null || isDebug">
        <div class="text-3xl">{{ heart.heartRate != null  ? heart.heartRate.toFixed(0) : 'n/a' }} bpm</div>
      </UFormField>
      <UFormField class="text-3xl mb-1" label="Grade" orientation="horizontal" v-if="trainer.isConnected || isDebug">
        <UButton variant="outline" icon="i-lucide-plus" size="lg" class="mr-2" @click="trainer.grade += 0.1"></UButton>
        <span class="text-3xl">{{ trainer.grade.toFixed(1) }} %</span>
        <UButton variant="outline" icon="i-lucide-minus" size="lg" class="ml-2" @click="trainer.grade -= 0.1"></UButton>
      </UFormField>
    </UForm>

    <UForm>
      <UFormField label="Distance" orientation="horizontal" class="text-4xl mb-1">
        <div class="text-4xl">{{ (activity.distance/1000).toFixed(2) }} km</div>
      </UFormField>

      <UFormField class="text-4xl mb-1" label="Climb" orientation="horizontal">
        <div class="text-4xl">{{ activity.climb.toFixed(1) }} m</div>
      </UFormField>

      <UFormField label="Time" orientation="horizontal" class="text-4xl mb-1">
        <div class="text-4xl">{{ Math.trunc(activity.elapsed/3600).toString().padStart(2, '0') }}:{{ (Math.trunc(activity.elapsed/60)%60).toString().padStart(2, '0') }}:{{ Math.trunc(activity.elapsed%60).toString().padStart(2, '0') }}</div>
      </UFormField>
    </UForm>
  </UContainer>

  <UContainer>

  </UContainer>
</template>
