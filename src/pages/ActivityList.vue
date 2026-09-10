<script setup lang="ts">
    import { computed } from 'vue';
    import { useActivitiesStore } from '@/stores';
    import Activity from '@/components/Activity.vue';

    const activitiesStore = useActivitiesStore();
    const activities = computed(() => {
        return [...activitiesStore.activites].sort((a, b) => (b.startDate?.getTime() ?? 0) - (a.startDate?.getTime() ?? 0) )
    })
</script>


<template>
    <UContainer>
        <UPageGrid>
            <Activity :activity="activity" v-for="(activity, index) in activities" :key="index"></Activity>
        </UPageGrid> 
    </UContainer>
</template>