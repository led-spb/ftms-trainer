import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { trainerDb } from '@/lib/db'
import { liveQuery } from 'dexie'
import type { IActivity } from '@/models'
import { Activity } from '@/lib/activity'


export const useActivitiesStore = defineStore('activities', () => {

    const activitesQuery = liveQuery(() => trainerDb.activities.toArray());

    activitesQuery.subscribe(
        (value: IActivity[]) => {
            activites.value = value.map(data => new Activity(data))
        }
    )
    const activites = ref<Activity[]>([])
    return {activites}
})
