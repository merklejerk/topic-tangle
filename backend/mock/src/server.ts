import express from 'express';
import cors from 'cors';
import type { RoomConfig, UserSelection, CreateRoomRequest, SubmitSelectionRequest, IDataStore } from './types';
import { GroupCreator } from './group_creator';
import { authMiddleware } from './auth';
import { generateIcebreakerQuestions } from './chatgpt';

declare module 'express-serve-static-core' {
	interface Request {
		userId?: string;
	}
}

const createTangleMiddleware = (config: { dataStore: IDataStore; pruneDurationSeconds: number }) => {
    const { dataStore, pruneDurationSeconds } = config;
    const router = express.Router();

    // Middleware
    router.use(cors());
    router.use(express.json());

    // Create a new room
    router.post('/rooms', authMiddleware, async (req, res) => {
        try {
            const { topics, minGroupSize, maxGroupSize, style }: CreateRoomRequest = req.body;
            const userId = req.userId;

            if (!userId || !topics || !Array.isArray(topics) || topics.length < 2) {
                return res.status(400).json({ 
                    error: 'Invalid request: organizerId and at least 2 topics are required' 
                });
            }

            if (style && (typeof(style) !== 'string' || style.length > 128)) {
                return res.status(400).json({ 
                    error: 'Invalid request: invalid style'
                });
            }

            const sanitizedMinGroupSize = Math.max(2, Math.min(minGroupSize || 2, 100));
            const sanitizedMaxGroupSize = Math.max(2, Math.min(maxGroupSize || 10, 100));

            if (sanitizedMinGroupSize >= sanitizedMaxGroupSize) {
                return res.status(400).json({ 
                    error: 'Invalid request: minGroupSize must be less than maxGroupSize' 
                });
            }

            const sanitizedTopics = topics
                .map((topic: string) => topic.trim().substring(0, 50))
                .filter((topic: string) => topic.length > 0);

            const uniqueTopics = Array.from(
                new Set(
                    sanitizedTopics.map(topic => topic.toLowerCase().replace(/[^a-z0-9]/g, ''))
                )
            ).map(uniqueKey =>
                sanitizedTopics.find(topic => topic.toLowerCase().replace(/[^a-z0-9]/g, '') === uniqueKey)
            );

            if (uniqueTopics.length < 2 || uniqueTopics.length > 32) {
                return res.status(400).json({ 
                    error: 'Invalid request: topics must include between 2 and 32 unique names' 
                });
            }

            const filteredUniqueTopics = uniqueTopics.filter((topic): topic is string => topic !== undefined);

            const topicsWithIds = filteredUniqueTopics.map((topic: string) => ({
                id: Math.random().toString(36).substring(2, 8).toUpperCase(),
                name: topic
            }));

            const room: RoomConfig = {
                id: Math.random().toString(36).substring(2, 8).toUpperCase(),
                organizerId: userId,
                topics: topicsWithIds,
                minGroupSize: sanitizedMinGroupSize,
                maxGroupSize: sanitizedMaxGroupSize,
                isActive: true,
                createdAt: new Date(),
                style,
            };

            await dataStore.createRoom(room);
            console.log(`Room created: ${room.id} by organizer ${userId}`);
            res.status(201).json(room);
        } catch (error) {
            console.error('Error creating room:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get room by ID
    router.get('/rooms/:roomId', async (req, res) => {
        try {
            const { roomId } = req.params;
            const room = await dataStore.getRoom(roomId);

            if (!room) {
                return res.status(404).json({ error: 'Room not found' });
            }

            res.json(room);
        } catch (error) {
            console.error('Error getting room:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Submit user selection
    router.post('/rooms/:roomId/selections', authMiddleware, async (req, res) => {
        try {
            const { roomId } = req.params;
            const userId = req.userId; // Use authenticated userId from middleware
            const { selectedTopics }: SubmitSelectionRequest = req.body;

            if (!userId || !Array.isArray(selectedTopics)) {
                return res.status(400).json({ 
                    error: 'Invalid request: userId and selectedTopics array are required' 
                });
            }

            const room = await dataStore.getRoom(roomId);
            if (!room) {
                return res.status(404).json({ error: 'Room not found' });
            }

            const results = await dataStore.getRoomResults(roomId);
            if (results) {
                return res.status(403).json({ error: 'Selections cannot be modified after results are generated' });
            }

            const validTopicIds = new Set(room.topics.map(topic => topic.id));
            const filteredTopics = selectedTopics.filter(topicId => validTopicIds.has(topicId));

            const selection: UserSelection = {
                userId,
                roomId,
                selectedTopics: filteredTopics,
                updatedAt: new Date()
            };

            if (filteredTopics.length === 0) {
                await dataStore.deleteUserSelection(userId, roomId);
                return res.status(200).json({ success: true, message: 'Selection cleared' });
            }

            await dataStore.submitUserSelection(selection);
            res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error submitting selection:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Delete user selection
    router.delete('/rooms/:roomId/selections', authMiddleware, async (req, res) => {
        try {
            const { roomId } = req.params;
            const userId = req.userId;

            if (!userId) {
                return res.status(400).json({ error: 'Invalid request: userId is required' });
            }

            const room = await dataStore.getRoom(roomId);
            if (!room) {
                return res.status(404).json({ error: 'Room not found' });
            }

            const results = await dataStore.getRoomResults(roomId);
            if (results) {
                return res.status(403).json({ error: 'Selections cannot be deleted after results are generated' });
            }

            await dataStore.deleteUserSelection(userId, roomId);
            res.status(200).json({ success: true, message: 'Selection deleted' });
        } catch (error) {
            console.error('Error deleting selection:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Create breakout groups (tangle!)
    router.post('/rooms/:roomId/breakout', authMiddleware, async (req, res) => {
        try {
            const { roomId } = req.params;
            const userId = req.userId;
            const room = await dataStore.getRoom(roomId);

            if (!room) {
                return res.status(404).json({ error: 'Room not found' });
            }

            if (room.organizerId !== userId) {
                return res.status(403).json({ error: 'Only the organizer can create breakout groups' });
            }

            const selections = await dataStore.getUserSelections(roomId);
            const results = GroupCreator.createBreakoutGroups(room, selections);

            // Generate icebreaker questions for all group topics
            const allTopics = results.groups.flatMap(group => group.assignedTopics.map(topicId => {
                const topic = room.topics.find(t => t.id === topicId);
                return topic ? topic.name : null;
            })).filter((topic): topic is string => topic !== null);

            const icebreakerData = await generateIcebreakerQuestions(allTopics);

            for (const group of results.groups) {
                const topicName = room.topics.find(t => t.id === group.assignedTopics[0])?.name;
                group.icebreakerQuestions = icebreakerData
                    .find(data => data.topic === topicName)?.questions || [];
            }

            await dataStore.storeRoomResults(results);

            console.log(`Breakout groups created for room ${roomId}: ${results.groups.length} groups, ${results.unassignedUsers.length} unassigned`);
            res.json(results);
        } catch (error) {
            console.error('Error creating breakout groups:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.get('/rooms/:roomId/data', authMiddleware, async (req, res) => {
        try {
            const { roomId } = req.params;
            const userId = req.userId;

            const room = await dataStore.getRoom(roomId);
            if (!room) {
                return res.status(404).json({ error: 'Room not found' });
            }

            if (!userId) {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            const selections = await dataStore.getUserSelections(roomId);
            const results = await dataStore.getRoomResults(roomId);
            if (results || room.organizerId === userId) {
                // Organizers can see all selections.
                return res.json({ selections, results });
            } else {
                // Non-organizers can only see their own selections.
                const userSelection = selections.find(selection => selection.userId === userId);
                return res.json({ selections: [userSelection], results });
            }
        } catch (error) {
            console.error('Error getting room data:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Prune rooms
    router.post('/prune', async (req, res) => {
        try {
            await dataStore.prune(pruneDurationSeconds);
            console.info(`Pruned rooms older than ${pruneDurationSeconds} seconds.`);
            res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error pruning rooms:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // 404 handler
    router.use((req, res) => {
        res.status(404).json({ error: 'Endpoint not found' });
    });

    return router;
};

export { createTangleMiddleware };
