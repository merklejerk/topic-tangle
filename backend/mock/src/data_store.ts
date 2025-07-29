import type { RoomConfig, UserSelection, RoomResults, IDataStore } from './types';

export class InMemoryDataStore implements IDataStore {
	private rooms: Map<string, RoomConfig> = new Map();
	private userSelections: Map<string, UserSelection[]> = new Map();
	private roomResults: Map<string, RoomResults> = new Map();

	// Room operations
	async createRoom(room: RoomConfig): Promise<void> {
		this.rooms.set(room.id, room);
		this.userSelections.set(room.id, []);
	}

	async getRoom(roomId: string): Promise<RoomConfig | null> {
		return this.rooms.get(roomId) || null;
	}

	async getAllRooms(): Promise<RoomConfig[]> {
		return Array.from(this.rooms.values());
	}

	// User selection operations
	async submitUserSelection(selection: UserSelection): Promise<void> {
		const selections = this.userSelections.get(selection.roomId) || [];
		const existingIndex = selections.findIndex(s => s.userId === selection.userId);
		
		if (existingIndex >= 0) {
			selections[existingIndex] = selection;
		} else {
			selections.push(selection);
		}
		
		this.userSelections.set(selection.roomId, selections);
		console.log(`User selection updated: ${selection.userId} in room ${selection.roomId}`);
	}

	async deleteUserSelection(userId: string, roomId: string): Promise<void> {
		const selections = this.userSelections.get(roomId) || [];
		const updatedSelections = selections.filter(selection => selection.userId !== userId);
		this.userSelections.set(roomId, updatedSelections);
		console.log(`User selection deleted: ${userId} in room ${roomId}`);
	}

	async getUserSelections(roomId: string): Promise<UserSelection[]> {
		return [...(this.userSelections.get(roomId) || [])];
	}

	// Room results operations
	async storeRoomResults(results: RoomResults): Promise<void> {
		this.roomResults.set(results.roomId, results);
	}

	async getRoomResults(roomId: string): Promise<RoomResults | null> {
		return this.roomResults.get(roomId) || null;
	}

	// Utility methods
	async reset(): Promise<void> {
		this.rooms.clear();
		this.userSelections.clear();
		this.roomResults.clear();
		console.log('Data store reset');
	}

	async getStats() {
		return {
			rooms: this.rooms.size,
			totalUserSelections: Array.from(this.userSelections.values()).reduce((sum, selections) => sum + selections.length, 0),
			roomResults: this.roomResults.size
		};
	}
}
