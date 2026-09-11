<script setup lang="ts">
    import { ref } from 'vue';
    import { Activity } from '@/lib/activity';
    import { formatDuration } from '@/lib/format';

    defineProps<{
        activity: Activity
    }>();

    const isOpen = ref(false)

    const formatActivityDate = (activity: Activity) => {
        return activity.startDate?.toLocaleString()
    }

    const removeActivity = async (activity: Activity) => {
        activity.remove()
        isOpen.value = false
    }
    
    const exportActivity = async (activity: Activity) => {
        const fitData = await activity.exportFit()
        const blob = new Blob([fitData.buffer as ArrayBuffer], {type: 'application/octetstream'});
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `activity-${activity.startDate!.toISOString().replaceAll(/[-.:Z]/g,'')}.fit`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

</script>

<template>
    <UPageCard :title="formatActivityDate(activity)">
        <template #description>
            <UForm class="mt-2">
                <UFormField label="Total time" orientation="horizontal">{{ formatDuration(activity.elapsed) }}</UFormField>
                <UFormField label="Distance" orientation="horizontal">{{ (activity.distance/1000).toFixed(2) }} km</UFormField>
            </UForm>
        </template>
        <template #footer>
            <UButton icon="i-lucide-download" size="sm" @click="exportActivity(activity)" :disabled="!activity.finishDate"></UButton>
            <UModal title="Remove activity?" :ui="{ footer: 'justify-end' }" v-model:open="isOpen">
                <UButton icon="i-lucide-trash-2" size="sm" class="ml-1"></UButton>

                <template #footer="{ close }">
                <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
                <UButton label="Yes" color="neutral" @click="removeActivity(activity)"/>
                </template>            
            </UModal>
        </template>
    </UPageCard>

</template>
