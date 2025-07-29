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

export type CreateRoomArgs = Omit<RoomConfig, 'id' | 'createdAt' | 'topics'> & { topics: string[] };
