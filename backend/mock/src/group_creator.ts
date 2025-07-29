import type { RoomConfig, UserSelection, BreakoutGroup, RoomResults } from './types';
import { v4 as uuidv4 } from 'uuid';

export class GroupCreator {
	static createBreakoutGroups(room: RoomConfig, selections: UserSelection[]): RoomResults {
		if (selections.length === 0) {
			return {
				roomId: room.id,
				groups: [],
				unassignedUsers: [],
				createdAt: new Date()
			};
		}

		const groups = this.groupUsersByInterests(room, selections);
		const assignedUsers = new Set(groups.flatMap(g => g.members));
		const unassignedUsers = selections
			.map(s => s.userId)
			.filter(userId => !assignedUsers.has(userId));

		return {
			roomId: room.id,
			groups,
			unassignedUsers,
			createdAt: new Date()
		};
	}

	private static groupUsersByInterests(room: RoomConfig, selections: UserSelection[]): BreakoutGroup[] {
		const groups: BreakoutGroup[] = [];
		const usersWithTopics = selections.map(selection => ({
			userId: selection.userId,
			topics: selection.selectedTopics
		}));

		const processed = new Set<string>();

		// Adjust minGroupSize to be at most the number of users
		const minGroupSize = Math.min(room.minGroupSize, usersWithTopics.length);

		// Calculate all possible user pairs and their topic overlaps
		const userPairs = this.calculateUserPairs(usersWithTopics);
		
		// Sort pairs by overlap count (descending), then shuffle ties randomly
		const sortedPairs = userPairs
			.sort((a, b) => {
				const overlapDiff = b.commonTopics.length - a.commonTopics.length;
				// If same overlap, randomize order
				return overlapDiff !== 0 ? overlapDiff : Math.random() - 0.5;
			});

		// Build groups starting with highest overlap pairs
		for (const pair of sortedPairs) {
			if (processed.has(pair.user1.userId) || processed.has(pair.user2.userId)) {
				continue;
			}

			if (pair.commonTopics.length === 0) {
				break; // No more meaningful pairs
			}

			// Create new group with this pair
			const group: BreakoutGroup = {
				id: uuidv4(),
				roomId: room.id,
				members: [pair.user1.userId, pair.user2.userId],
				assignedTopics: [this.selectGroupTopic(pair.commonTopics)], // Single topic
				icebreakerQuestions: this.generateIcebreakerQuestions()
			};

			processed.add(pair.user1.userId);
			processed.add(pair.user2.userId);

			// Try to add more users to this group
			this.expandGroup(group, usersWithTopics, processed, room.maxGroupSize);

			// Only add group if it meets minimum size
			if (group.members.length >= minGroupSize) {
				groups.push(group);
			} else {
				// Remove processed users if group is too small
				for (const memberId of group.members) {
					processed.delete(memberId);
				}
			}
		}

		// Handle remaining unprocessed users
		this.assignRemainingUsers(groups, usersWithTopics, processed, room);

		return groups;
	}

	private static calculateUserPairs(users: Array<{userId: string, topics: string[]}>) {
		const pairs = [];
		
		for (let i = 0; i < users.length; i++) {
			for (let j = i + 1; j < users.length; j++) {
				const user1 = users[i];
				const user2 = users[j];
				const commonTopics = user1.topics.filter(topic => user2.topics.includes(topic));
				
				pairs.push({
					user1,
					user2,
					commonTopics
				});
			}
		}
		
		return pairs;
	}

	private static expandGroup(
		group: BreakoutGroup, 
		allUsers: Array<{userId: string, topics: string[]}>, 
		processed: Set<string>, 
		maxGroupSize: number
	) {
		const groupTopic = group.assignedTopics[0]; // We know there's exactly one topic
		
		// Find users who also have this topic and aren't processed yet
		const candidates = allUsers
			.filter(user => 
				!processed.has(user.userId) && 
				user.topics.includes(groupTopic)
			)
			.map(user => ({
				...user,
				// Calculate how many of their topics match the group's existing members
				relevanceScore: this.calculateRelevanceScore(user, group, allUsers)
			}))
			.sort((a, b) => {
				// Sort by relevance score, break ties randomly
				const scoreDiff = b.relevanceScore - a.relevanceScore;
				return scoreDiff !== 0 ? scoreDiff : Math.random() - 0.5;
			});

		// Add candidates until we reach max group size
		for (const candidate of candidates) {
			if (group.members.length >= maxGroupSize) break;
			
			group.members.push(candidate.userId);
			processed.add(candidate.userId);
		}
	}

	private static calculateRelevanceScore(
		user: {userId: string, topics: string[]}, 
		group: BreakoutGroup,
		allUsers: Array<{userId: string, topics: string[]}>
	): number {
		// Count how many topics this user shares with existing group members
		let totalOverlap = 0;
		
		for (const memberId of group.members) {
			const member = allUsers.find(u => u.userId === memberId);
			if (member) {
				const overlap = user.topics.filter(topic => member.topics.includes(topic)).length;
				totalOverlap += overlap;
			}
		}
		
		return totalOverlap;
	}

	private static assignRemainingUsers(
		groups: BreakoutGroup[], 
		allUsers: Array<{userId: string, topics: string[]}>, 
		processed: Set<string>,
		room: RoomConfig
	) {
		const remainingUsers = allUsers.filter(user => !processed.has(user.userId));
		
		for (const user of remainingUsers) {
			if (groups.length === 0) {
				// No groups exist, create a new one
				const group: BreakoutGroup = {
					id: uuidv4(),
					roomId: room.id,
					members: [user.userId],
					assignedTopics: [this.selectGroupTopic(user.topics)],
					icebreakerQuestions: this.generateIcebreakerQuestions()
				};
				groups.push(group);
			} else {
				// Find smallest group that isn't at max capacity
				const availableGroups = groups.filter(g => g.members.length < room.maxGroupSize);
				
				if (availableGroups.length > 0) {
					// Sort by size, break ties randomly
					availableGroups.sort((a, b) => {
						const sizeDiff = a.members.length - b.members.length;
						return sizeDiff !== 0 ? sizeDiff : Math.random() - 0.5;
					});
					
					const targetGroup = availableGroups[0];
					targetGroup.members.push(user.userId);
				} else {
					// All groups are at max capacity, create a new group
					const group: BreakoutGroup = {
						id: uuidv4(),
						roomId: room.id,
						members: [user.userId],
						assignedTopics: [this.selectGroupTopic(user.topics)],
						icebreakerQuestions: this.generateIcebreakerQuestions()
					};
					groups.push(group);
				}
			}
		}
	}

	private static selectGroupTopic(topics: string[]): string {
		if (topics.length === 0) {
			return 'General Discussion'; // Fallback topic
		}
		
		// For now, randomly select from available topics
		// In a more sophisticated version, we could track topic popularity
		const randomIndex = Math.floor(Math.random() * topics.length);
		return topics[randomIndex];
	}

	private static generateIcebreakerQuestions(): string[] {
		const questions = [
			"What's the most interesting project you've worked on recently?",
			"If you could learn any new technology this year, what would it be?",
			"What's your favorite development tool and why?",
			"Share a coding challenge you recently overcame.",
			"What trend in tech are you most excited about?",
			"What's the best piece of advice you've received as a developer?",
			"If you could have dinner with any programmer (living or dead), who would it be?",
			"What's your go-to resource when learning something new?",
			"What's your preferred way to debug complex issues?",
			"Share something you learned this week that excited you.",
			"What's the most creative solution you've implemented recently?",
			"If you could automate one part of your workflow, what would it be?"
		];

		// Return 2-3 random questions
		const shuffled = questions.sort(() => 0.5 - Math.random());
		return shuffled.slice(0, 2 + Math.floor(Math.random() * 2));
	}
}
