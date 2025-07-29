import { expect } from 'chai';
import * as sinon from 'sinon';
import { GroupCreator } from '../src/group_creator';
import type { RoomConfig, UserSelection, BreakoutGroup, Topic } from '../src/types';
import * as uuid from 'uuid';

describe('GroupCreator', () => {
  // @ts-ignore
  let groupUsersByInterests: (room: RoomConfig, selections: UserSelection[]) => BreakoutGroup[];

  before(() => {
    // @ts-ignore - Make the private method accessible for testing
    groupUsersByInterests = GroupCreator.groupUsersByInterests.bind(GroupCreator);
  });

  let randomStub: sinon.SinonStub;
  let uuidStub: sinon.SinonStub;
  let icebreakerStub: sinon.SinonStub;

  beforeEach(() => {
    // Stub Math.random() to make tests deterministic
    randomStub = sinon.stub(Math, 'random').returns(0.4); // Return a consistent value < 0.5

    // Stub uuidv4 to have predictable IDs
    let i = 0;
    uuidStub = sinon.stub(uuid, 'v4').callsFake(() => `uuid-${i++}` as any);

    // Stub icebreaker questions
    // @ts-ignore
    icebreakerStub = sinon.stub(GroupCreator, 'generateIcebreakerQuestions').returns(['icebreaker1', 'icebreaker2']);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('groupUsersByInterests', () => {
    it('should create a single group when all users share a topic', () => {
      const room: RoomConfig = {
        id: 'room1',
        organizerId: 'org1',
        topics: [{id: 'A', name: 'A'}, {id: 'B', name: 'B'}, {id: 'C', name: 'C'}],
        minGroupSize: 2,
        maxGroupSize: 4,
        isActive: true,
        createdAt: new Date(),
      };
      const selections: UserSelection[] = [
        { userId: 'user1', roomId: 'room1', selectedTopics: ['A'], updatedAt: new Date() },
        { userId: 'user2', roomId: 'room1', selectedTopics: ['A'], updatedAt: new Date() },
        { userId: 'user3', roomId: 'room1', selectedTopics: ['A'], updatedAt: new Date() },
      ];

      const result = groupUsersByInterests(room, selections);

      expect(result).to.have.lengthOf(1);
      expect(result[0].members).to.have.deep.members(['user1', 'user2', 'user3']);
      expect(result[0].assignedTopics).to.deep.equal(['A']);
    });

    it('should create multiple groups based on distinct interests', () => {
      const room: RoomConfig = {
        id: 'room1',
        organizerId: 'org1',
        topics: [{id: 'A', name: 'A'}, {id: 'B', name: 'B'}, {id: 'C', name: 'C'}, {id: 'D', name: 'D'}],
        minGroupSize: 2,
        maxGroupSize: 2,
        isActive: true,
        createdAt: new Date(),
      };
      const selections: UserSelection[] = [
        { userId: 'user1', roomId: 'room1', selectedTopics: ['A', 'B'], updatedAt: new Date() },
        { userId: 'user2', roomId: 'room1', selectedTopics: ['A'], updatedAt: new Date() },
        { userId: 'user3', roomId: 'room1', selectedTopics: ['C', 'D'], updatedAt: new Date() },
        { userId: 'user4', roomId: 'room1', selectedTopics: ['C'], updatedAt: new Date() },
      ];

      const result = groupUsersByInterests(room, selections);
      
      expect(result).to.have.lengthOf(2);

      const groupAB = result.find(g => g.members.includes('user1'));
      const groupCD = result.find(g => g.members.includes('user3'));

      expect(groupAB!.members).to.have.deep.members(['user1', 'user2']);
      expect(['A', 'B']).to.include(groupAB!.assignedTopics[0]);

      expect(groupCD!.members).to.have.deep.members(['user3', 'user4']);
      expect(['C', 'D']).to.include(groupCD!.assignedTopics[0]);
    });

    it('should select the most popular topic among group members', () => {
      const room: RoomConfig = {
        id: 'room1',
        organizerId: 'org1',
        topics: [{id: 'A', name: 'A'}, {id: 'B', name: 'B'}, {id: 'C', name: 'C'}],
        minGroupSize: 2,
        maxGroupSize: 4,
        isActive: true,
        createdAt: new Date(),
      };
      const selections: UserSelection[] = [
        { userId: 'user1', roomId: 'room1', selectedTopics: ['A', 'B'], updatedAt: new Date() },
        { userId: 'user2', roomId: 'room1', selectedTopics: ['A', 'B'], updatedAt: new Date() },
        { userId: 'user3', roomId: 'room1', selectedTopics: ['A'], updatedAt: new Date() },
      ];

      // With this setup, user1/user2 will be paired.
      // Their common topics are A and B.
      // Among the 3 users, 'A' is selected by 3, 'B' is selected by 2.
      // The group topic should be 'A'.
      const result = groupUsersByInterests(room, selections);

      expect(result).to.have.lengthOf(1);
      expect(result[0].assignedTopics).to.deep.equal(['A']);
    });

    it('should assign remaining users to existing groups if possible', () => {
      const room: RoomConfig = {
        id: 'room1',
        organizerId: 'org1',
        topics: [{id: 'A', name: 'A'}, {id: 'B', name: 'B'}],
        minGroupSize: 2,
        maxGroupSize: 3,
        isActive: true,
        createdAt: new Date(),
      };
      const selections: UserSelection[] = [
        { userId: 'user1', roomId: 'room1', selectedTopics: ['A'], updatedAt: new Date() },
        { userId: 'user2', roomId: 'room1', selectedTopics: ['A'], updatedAt: new Date() },
        { userId: 'user3', roomId: 'room1', selectedTopics: ['B'], updatedAt: new Date() }, // This user will be unassigned initially
      ];

      const result = groupUsersByInterests(room, selections);

      expect(result).to.have.lengthOf(1);
      expect(result[0].members).to.have.deep.members(['user1', 'user2', 'user3']);
    });

    it('should create a new group for remaining users if all other groups are full', () => {
        const room: RoomConfig = {
            id: 'room1',
            organizerId: 'org1',
            topics: [{id: 'A', name: 'A'}, {id: 'B', name: 'B'}],
            minGroupSize: 2,
            maxGroupSize: 2,
            isActive: true,
            createdAt: new Date(),
        };
        const selections: UserSelection[] = [
            { userId: 'user1', roomId: 'room1', selectedTopics: ['A'], updatedAt: new Date() },
            { userId: 'user2', roomId: 'room1', selectedTopics: ['A'], updatedAt: new Date() },
            { userId: 'user3', roomId: 'room1', selectedTopics: ['B'], updatedAt: new Date() },
        ];

        const result = groupUsersByInterests(room, selections);

        expect(result).to.have.lengthOf(2);
        const groupA = result.find(g => g.assignedTopics.includes('A'));
        const groupB = result.find(g => g.assignedTopics.includes('B'));

        expect(groupA!.members).to.have.deep.members(['user1', 'user2']);
        expect(groupB!.members).to.have.deep.members(['user3']);
    });

    it('should assign unassigned users to existing group, ignoring size constraints', () => {
        const room: RoomConfig = {
            id: 'room1',
            organizerId: 'org1',
            topics: [{id: 'A', name: 'A'}, {id: 'B', name: 'B'}, {id: 'C', name: 'C'}],
            minGroupSize: 2,
            maxGroupSize: 4,
            isActive: true,
            createdAt: new Date(),
        };
        const selections: UserSelection[] = [
            { userId: 'user1', roomId: 'room1', selectedTopics: ['A'], updatedAt: new Date() },
            { userId: 'user2', roomId: 'room1', selectedTopics: ['A'], updatedAt: new Date() },
            { userId: 'user3', roomId: 'room1', selectedTopics: ['B'], updatedAt: new Date() },
            { userId: 'user4', roomId: 'room1', selectedTopics: ['B'], updatedAt: new Date() },
            { userId: 'user5', roomId: 'room1', selectedTopics: ['C'], updatedAt: new Date() },
        ];

        const result = groupUsersByInterests(room, selections);
        
        expect(result).to.have.lengthOf(2);
        expect(result[0].members).to.have.lengthOf(2);
        expect(result[1].members).to.have.lengthOf(3);
    });

    it('should handle users with no common topics by assigning them to the smallest groups', () => {
        const room: RoomConfig = {
            id: 'room1',
            organizerId: 'org1',
            topics: [{id: 'A', name: 'A'}, {id: 'B', name: 'B'}, {id: 'C', name: 'C'}, {id: 'D', name: 'D'}],
            minGroupSize: 2,
            maxGroupSize: 3,
            isActive: true,
            createdAt: new Date(),
        };
        const selections: UserSelection[] = [
            { userId: 'user1', roomId: 'room1', selectedTopics: ['A'], updatedAt: new Date() },
            { userId: 'user2', roomId: 'room1', selectedTopics: ['A'], updatedAt: new Date() },
            { userId: 'user3', roomId: 'room1', selectedTopics: ['B'], updatedAt: new Date() },
            { userId: 'user4', roomId: 'room1', selectedTopics: ['C'], updatedAt: new Date() },
            { userId: 'user5', roomId: 'room1', selectedTopics: ['D'], updatedAt: new Date() },
        ];

        const result = groupUsersByInterests(room, selections);
        
        expect(result).to.have.lengthOf(2);
        const groupWith3 = result.find(g => g.members.length === 3);
        const groupWith2 = result.find(g => g.members.length === 2);

        expect(groupWith3).to.exist;
        expect(groupWith2).to.exist;
        expect(groupWith3!.members.concat(groupWith2!.members)).to.have.deep.members(['user1', 'user2', 'user3', 'user4', 'user5']);
    });
  });
});
