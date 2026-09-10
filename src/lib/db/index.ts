import { Dexie, type EntityTable } from 'dexie';
import type { IActivity, IActivityRecord, IRoute } from '@/models';


class TrainerDatabase extends Dexie {
    activities!: EntityTable<IActivity, 'id'>;
    activityRecords!: EntityTable<IActivityRecord>;
    activeRoute!: EntityTable<IRoute, 'id'>;

    constructor(){
        super('trainer');
        this.version(1).stores({
            activities: '++id, startDate, finishDate',
            activityRecords: '++, activityId',
            activeRoute: 'id',
        })
    }
} 
const trainerDb = new TrainerDatabase();

export { trainerDb };