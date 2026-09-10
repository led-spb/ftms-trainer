<script setup lang="ts">
    import { computed } from 'vue';
    import { useActivitiesStore } from '@/stores';
    import Activity from '@/components/Activity.vue';

    import { useRoute } from 'vue-router';

    const activityId = useRoute().params.id;
    const activitiesStore = useActivitiesStore();

    const activity = computed(() => activitiesStore.activites.find( (value) => value.id == activityId));
</script>


<template>
    <UContainer>
        <Activity :activity="activity" v-if="activity"></Activity>
    </UContainer>
</template>