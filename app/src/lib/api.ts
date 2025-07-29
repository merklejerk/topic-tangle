import type { RoomConfig, UserSelection, CreateRoomArgs, RoomData, RoomResults } from './types';
import { ENV } from './config';
import { getUserId, sign } from './crypto';

async function getAuthHeaders() {
	const keyName = 'user'; // Always use the default user key
	const timestamp = new Date().toISOString();
	const userId = await getUserId(keyName);
	const signature = await sign(keyName, timestamp);

	return {
		'Content-Type': 'application/json',
		'X-User-Id': userId,
		'X-Timestamp': timestamp,
		'X-Signature': signature
	};
}

// Real backend API calls
export class RoomAPI {
	private static readonly POLL_INTERVAL = ENV.POLL_INTERVAL;

	private static getRoomUrl(roomId: string, endpoint: string = ''): string {
		return `${ENV.API_BASE_URL}/rooms/${roomId}${endpoint}`;
	}

	static async createRoom(config: CreateRoomArgs): Promise<RoomConfig> {
		const headers = await getAuthHeaders();
		const response = await fetch(`${ENV.API_BASE_URL}/rooms`, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				organizerId: config.organizerId,
				topics: config.topics, // Topics are now strings
				minGroupSize: config.minGroupSize,
				maxGroupSize: config.maxGroupSize
			})
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to create room');
		}

		const room = await response.json();
		// Convert date strings back to Date objects
		room.createdAt = new Date(room.createdAt);
		return room;
	}

	static async getRoom(roomId: string): Promise<RoomConfig | null> {
		try {
			const response = await fetch(this.getRoomUrl(roomId));
			
			if (response.status === 404) {
				return null;
			}
			
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to get room');
			}

			const room = await response.json();
			// Convert date strings back to Date objects
			room.createdAt = new Date(room.createdAt);
			return room;
		} catch (error) {
			console.error('Failed to get room:', error);
			return null;
		}
	}

	static async submitUserSelection(selection: UserSelection): Promise<void> {
		const headers = await getAuthHeaders();

		if (selection.selectedTopics.length === 0) {
			const response = await fetch(this.getRoomUrl(selection.roomId, '/selections'), {
				method: 'DELETE',
				headers
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to delete selection');
			}

			return;
		}

		const response = await fetch(this.getRoomUrl(selection.roomId, '/selections'), {
			method: 'POST',
			headers,
			body: JSON.stringify({
				selectedTopics: selection.selectedTopics
			})
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to submit selection');
		}
	}

	static async createBreakoutGroups(roomId: string, organizerId: string): Promise<RoomResults> {
		const headers = await getAuthHeaders();
		const response = await fetch(`${ENV.API_BASE_URL}/rooms/${roomId}/breakout`, {
			method: 'POST',
			headers
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to create breakout groups');
		}

		const results = await response.json();
		// Convert date strings back to Date objects
		results.createdAt = new Date(results.createdAt);
		return results;
	}

	static async getRoomData(roomId: string): Promise<RoomData> {
		try {
			const headers = await getAuthHeaders();
			const response = await fetch(this.getRoomUrl(roomId, '/data'), {
				headers
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to get room data');
			}

			const { selections, results } = await response.json();
			return {
				selections: selections.map((selection: any) => ({
					...selection,
					updatedAt: new Date(selection.updatedAt)
				})),
				results: results ? { ...results, createdAt: new Date(results.createdAt) } : null
			};
		} catch (error) {
			console.error('Failed to get room data:', error);
			return { selections: [], results: null };
		}
	}

	static createPollingSubscription<T>(
		fetchFn: () => Promise<T>,
		callback: (data: T) => boolean, // Return false to stop polling
		interval: number = this.POLL_INTERVAL
	): () => void {
		let timeoutId: ReturnType<typeof setTimeout> | undefined;

		const poll = async () => {
			try {
				const data = await fetchFn();
				const shouldContinue = callback(data);

				if (shouldContinue) {
					timeoutId = setTimeout(poll, interval);
				}
			} catch (error) {
				console.error('Polling error:', error);
				// Optionally decide if you want to continue polling on error
				timeoutId = setTimeout(poll, interval);
			}
		};

		poll(); // Start immediately

		// Return cleanup function
		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	}
}
