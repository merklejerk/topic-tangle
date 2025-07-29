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

export type CreateRoomArgs = Omit<RoomConfig, 'id' | 'createdAt' | 'topics'> & { topics: string[] };

export interface RoomData {
	selections: UserSelection[];
	results: RoomResults | null;
}
