<script setup lang="ts">
  import { useTrainerStore, useHeartStore, useActivityStore } from '@/stores';
  import { ref, computed } from 'vue'

  const trainer = useTrainerStore()
  const heart = useHeartStore()
  const activity = useActivityStore()

  const toastManager = useToast()

  function connectDevice(device: any){
    device.selectDevice()
      .catch((error: Error) => {
        console.error(error)
        toastManager.add({
          title: "Device connection error",
          description: `${error.name}: ${error.message}`,
          color: "error",
        })
      })
  }

  function changeTrainerGrade(delta: number){
    trainer.setBikeSimulation(trainer.grade + delta)
      .catch((error: Error) => {
        console.error(error)
        toastManager.add({
          title: "Trainer control error",
          description: `${error.name}: ${error.message}`,
          color: "error",
        })
      })
  }

  function startActitvitySession(){
    changeTrainerGrade(0)
    activity.startActivity(
      computed(() => { 
        return {
          speed: trainer.speed,
          power: trainer.power,
          cadence: trainer.cadence,
          grade: trainer.grade,
          heartRate: heart.heartRate
        }
      })
    )
  }

  function stopActivitySession(){
    activity.stopActivity()
  }

  function exportActivityData(){
    const blob = new Blob([activity.activityFitData?.buffer as ArrayBuffer], { type: 'application/octetstream' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'activity.fit';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);    
  }
</script>

<template>
  <UContainer>
    <div class="flex justify-center mb-4 mt-4">
      <UButton class="mr-2 text-lg" @click="connectDevice(trainer)" :disabled="trainer.isConnected"><template v-if="trainer.isConnected">{{ trainer.deviceName }}</template><template v-else>Connect trainer</template></UButton>
      <UButton class="mr-2 text-lg" @click="connectDevice(heart)" :disabled="heart.isConnected"><template v-if="heart.isConnected">{{ heart.deviceName }}</template><template v-else>Connect HRM</template></UButton>
      <UButton class="mr-2 text-lg" @click="startActitvitySession()" :disabled="!trainer.isConnected" v-if="!activity.isStarted">Start</UButton>
      <UButton class="mr-2 text-lg" @click="stopActivitySession()" v-if="activity.isStarted">Stop</UButton>
      <UButton class="mr-2 text-lg" @click="exportActivityData()" v-if="!activity.isStarted && activity.activityFitData">Download</UButton>
    </div>

    <UForm class="mb-6">
      <UFormField class="text-4xl mb-1" label="Grade" orientation="horizontal" v-if="trainer.isConnected">
        <UButton icon="i-lucide-plus" size="xl" class="mr-2" @click="changeTrainerGrade(+0.1)"></UButton>
        <span class="text-4xl">{{ trainer.grade.toFixed(1) }} %</span>
        <UButton icon="i-lucide-minus" size="xl" class="ml-2" @click="changeTrainerGrade(-0.1)"></UButton>
      </UFormField>
      <UFormField class="text-4xl mb-1" label="Speed" orientation="horizontal" v-if="trainer.isConnected">
        <div class="text-4xl">{{ trainer.speed.toFixed(1) }} km/h</div>
      </UFormField>
      <UFormField class="text-4xl mb-1" label="Power" orientation="horizontal" v-if="trainer.isConnected">
        <div class="text-4xl">{{ trainer.power.toFixed(0) }} wt</div>
      </UFormField>
      <UFormField class="text-4xl mb-1" label="Cadence" orientation="horizontal" v-if="trainer.isConnected">
        <div class="text-4xl">{{ trainer.cadence.toFixed(0) }} rpm</div>
      </UFormField>
      <UFormField class="text-4xl mb-1" label="Heart rate" orientation="horizontal" v-if="heart.isConnected">
        <div class="text-4xl">{{ heart.heartRate.toFixed(0) }} bpm</div>
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
</template>
