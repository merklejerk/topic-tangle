import { Datastore } from '@google-cloud/datastore';
import type { IDataStore, RoomConfig, UserSelection, RoomResults } from 'mock';

const ROOM_KIND = 'Room';
const USER_SELECTION_KIND = 'UserSelection';
const ROOM_RESULTS_KIND = 'RoomResults';

export class GoogleDataStore implements IDataStore {
    private datastore: Datastore;

    constructor() {
        this.datastore = new Datastore({
            projectId: process.env.DATASTORE_PROJECT_ID,
            apiEndpoint: process.env.DATASTORE_HOST,
        });
    }

    private getRoomKey(roomId: string) {
        if (!roomId) {
            throw new Error('A valid roomId is required to create a user selection key.');
        }
        return this.datastore.key([ROOM_KIND, roomId]);
    }

    async createRoom(room: RoomConfig): Promise<void> {
        const key = this.getRoomKey(room.id);
        await this.datastore.save({
            key: key,
            data: room,
        });
    }

    async getRoom(roomId: string): Promise<RoomConfig | null> {
        const key = this.getRoomKey(roomId);
        const [entity] = await this.datastore.get(key);
        if (!entity) {
            return null;
        }
        return {
            ...entity,
            createdAt: new Date(entity.createdAt),
        };
    }

    async getAllRooms(): Promise<RoomConfig[]> {
        const query = this.datastore.createQuery(ROOM_KIND);
        const [entities] = await this.datastore.runQuery(query);
        return entities.map(entity => ({
            ...entity,
            createdAt: new Date(entity.createdAt),
        }));
    }

    private getUserSelectionKey(userId: string, roomId: string) {
        const roomKey = this.getRoomKey(roomId);
        // The roomKey.name will be the roomId string.
        return this.datastore.key([roomKey.kind, roomKey.name!, USER_SELECTION_KIND, `${roomId}-${userId}`]);
    }

    async submitUserSelection(selection: UserSelection): Promise<void> {
        const key = this.getUserSelectionKey(selection.userId, selection.roomId);
        await this.datastore.save({
            key: key,
            data: selection,
        });
    }

    async deleteUserSelection(userId: string, roomId: string): Promise<void> {
        const key = this.getUserSelectionKey(userId, roomId);
        await this.datastore.delete(key);
    }

    async getUserSelections(roomId: string): Promise<UserSelection[]> {
        const roomKey = this.getRoomKey(roomId);
        const query = this.datastore.createQuery(USER_SELECTION_KIND).hasAncestor(roomKey);
        const [entities] = await this.datastore.runQuery(query);
        return entities.map(entity => ({
            ...entity,
            updatedAt: new Date(entity.updatedAt),
        }));
    }

    private getRoomResultsKey(roomId: string) {
        return this.datastore.key([ROOM_RESULTS_KIND, roomId]);
    }

    async storeRoomResults(results: RoomResults): Promise<void> {
        const key = this.getRoomResultsKey(results.roomId);
        await this.datastore.save({
            key: key,
            data: results,
        });
    }

    async getRoomResults(roomId: string): Promise<RoomResults | null> {
        const key = this.getRoomResultsKey(roomId);
        const [entity] = await this.datastore.get(key);
        if (!entity) {
            return null;
        }
        return {
            ...entity,
            createdAt: new Date(entity.createdAt),
        };
    }

    async reset(): Promise<void> {
        const kinds = [ROOM_KIND, USER_SELECTION_KIND, ROOM_RESULTS_KIND];
        for (const kind of kinds) {
            const query = this.datastore.createQuery(kind).select('__key__');
            const [entities] = await this.datastore.runQuery(query);
            const keys = entities.map((entity) => entity[this.datastore.KEY]);
            if (keys.length > 0) {
                await this.datastore.delete(keys);
            }
        }
    }

    async getStats(): Promise<{ rooms: number; totalUserSelections: number; roomResults: number; }> {
        const roomsQuery = this.datastore.createQuery(ROOM_KIND).select('__key__');
        const selectionsQuery = this.datastore.createQuery(USER_SELECTION_KIND).select('__key__');
        const resultsQuery = this.datastore.createQuery(ROOM_RESULTS_KIND).select('__key__');

        const [[rooms], [selections], [results]] = await Promise.all([
            this.datastore.runQuery(roomsQuery),
            this.datastore.runQuery(selectionsQuery),
            this.datastore.runQuery(resultsQuery),
        ]);

        return {
            rooms: rooms.length,
            totalUserSelections: selections.length,
            roomResults: results.length,
        };
    }
}
