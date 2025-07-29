import type { RoomConfig, UserSelection, RoomResults } from './types';

export class DataStore {
	private static rooms: Map<string, RoomConfig> = new Map();
	private static userSelections: Map<string, UserSelection[]> = new Map();
	private static roomResults: Map<string, RoomResults> = new Map();

	// Room operations
	static createRoom(room: RoomConfig): void {
		this.rooms.set(room.id, room);
		this.userSelections.set(room.id, []);
	}

	static getRoom(roomId: string): RoomConfig | null {
		return this.rooms.get(roomId) || null;
	}

	static getAllRooms(): RoomConfig[] {
		return Array.from(this.rooms.values());
	}

	// User selection operations
	static submitUserSelection(selection: UserSelection): void {
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

	static deleteUserSelection(userId: string, roomId: string): void {
		const selections = this.userSelections.get(roomId) || [];
		const updatedSelections = selections.filter(selection => selection.userId !== userId);
		this.userSelections.set(roomId, updatedSelections);
		console.log(`User selection deleted: ${userId} in room ${roomId}`);
	}

	static getUserSelections(roomId: string): UserSelection[] {
		return [...(this.userSelections.get(roomId) || [])];
	}

	// Room results operations
	static storeRoomResults(results: RoomResults): void {
		this.roomResults.set(results.roomId, results);
	}

	static getRoomResults(roomId: string): RoomResults | null {
		return this.roomResults.get(roomId) || null;
	}

	// Utility methods
	static reset(): void {
		this.rooms.clear();
		this.userSelections.clear();
		this.roomResults.clear();
		console.log('Data store reset');
	}

	static getStats() {
		return {
			rooms: this.rooms.size,
			totalUserSelections: Array.from(this.userSelections.values()).reduce((sum, selections) => sum + selections.length, 0),
			roomResults: this.roomResults.size
		};
	}
}
