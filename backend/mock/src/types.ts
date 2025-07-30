export interface Topic {
	id: string;
	name: string;
}

export interface RoomConfig {
	id: string;
	organizerId: string;
	topics: Topic[];
	minGroupSize: number;
	maxGroupSize: number;
	isActive: boolean;
	createdAt: Date;
	style?: string;
}

export interface UserSelection {
	userId: string;
	roomId: string;
	selectedTopics: string[]; // topic IDs
	updatedAt: Date;
}

export interface BreakoutGroup {
	id: string;
	roomId: string;
	members: string[]; // user IDs
	assignedTopics: string[];
	icebreakerQuestions: string[];
}

export interface RoomResults {
	roomId: string;
	groups: BreakoutGroup[];
	unassignedUsers: string[];
	createdAt: Date;
}

export interface CreateRoomRequest {
	topics: string[]; // Array of topic names
	minGroupSize: number;
	maxGroupSize: number;
	style?: string;
}

export interface SubmitSelectionRequest {
	selectedTopics: string[];
}

export interface RoomData {
	selections: UserSelection[];
	results: RoomResults | null;
}

export interface IDataStore {
    createRoom(room: RoomConfig): Promise<void>;
    getRoom(roomId: string): Promise<RoomConfig | null>;
    getAllRooms(): Promise<RoomConfig[]>;
    submitUserSelection(selection: UserSelection): Promise<void>;
    deleteUserSelection(userId: string, roomId: string): Promise<void>;
    getUserSelections(roomId: string): Promise<UserSelection[]>;
    storeRoomResults(results: RoomResults): Promise<void>;
    getRoomResults(roomId: string): Promise<RoomResults | null>;
    reset(): Promise<void>;
    getStats(): Promise<{
        rooms: number;
        totalUserSelections: number;
        roomResults: number;
    }>;
	prune(maxAgeSeconds: number): Promise<void>;
}
