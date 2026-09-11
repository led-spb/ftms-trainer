<script setup lang="ts">
  import type { NavigationMenuItem } from '@nuxt/ui';
  import { computed } from 'vue';
  import { useRoute } from 'vue-router';

  const route = useRoute()

  const items = computed<NavigationMenuItem[]>(() => [
    {
      label: 'Home',
      to: {name: 'home'},
      active: route.name == 'home'
    },
    {
      label: 'Ride',
      to: {name: 'ride'},
      active: route.name == 'ride'
    },
    {
      label: 'Activities',
      to: {name: 'activityList'},
      active: route.name == 'activityList'
    },
  ])
</script>

<template>
  <UApp>
    <UHeader title="Trainer" mode="drawer" class="h-10">
      <template #body>
        <UNavigationMenu :items="items" orientation="vertical" class="-mx-2.5" />
      </template>      
    </UHeader>

    <UMain  class="mt-4">
      <RouterView/>
    </UMain>
  </UApp>
</template>
