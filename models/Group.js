/**
 * Group Model
 * Handles group chat operations including AI bot management
 */

const { db } = require('../config/firebase');
const crypto = require('crypto');

class Group {
  /**
   * Create a new group
   * @param {Object} groupData - Group data { name, description, creator, participants }
   * @returns {Promise<Object>} Created group
   */
  static async create(groupData) {
    const { name, description, creator, participants = [] } = groupData;

    // Ensure creator is in participants
    if (!participants.includes(creator)) {
      participants.push(creator);
    }

    const groupDoc = {
      name,
      description,
      creator,
      participants,
      admins: [creator],
      profileImage: null,
      aiBot: {
        enabled: true,
        name: 'ChatBot AI',
        description: 'AI assistant for the group',
      },
      settings: {
        allowAI: true,
        allowMessages: true,
        requireApproval: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('groups').add(groupDoc);
    return { id: docRef.id, ...groupDoc };
  }

  /**
   * Get group by ID
   * @param {string} groupId - Group ID
   * @returns {Promise<Object>} Group document
   */
  static async getById(groupId) {
    const doc = await db.collection('groups').doc(groupId).get();
    if (!doc.exists) {
      throw new Error('Group not found');
    }
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Get all groups for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of groups
   */
  static async getUserGroups(userId) {
    const snapshot = await db
      .collection('groups')
      .where('participants', 'array-contains', userId)
      .get();

    return snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((left, right) => {
        const leftDate = new Date(left.updatedAt || left.createdAt || 0).getTime();
        const rightDate = new Date(right.updatedAt || right.createdAt || 0).getTime();
        return rightDate - leftDate;
      });
  }

  /**
   * Add participant to group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID to add
   */
  static async addParticipant(groupId, userId) {
    const groupRef = db.collection('groups').doc(groupId);
    const groupDoc = await groupRef.get();

    if (groupDoc.exists) {
      const participants = groupDoc.data().participants || [];
      if (!participants.includes(userId)) {
        await groupRef.update({
          participants: [...participants, userId],
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Remove participant from group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID to remove
   */
  static async removeParticipant(groupId, userId) {
    const groupRef = db.collection('groups').doc(groupId);
    const groupDoc = await groupRef.get();

    if (groupDoc.exists) {
      const participants = groupDoc.data().participants.filter(id => id !== userId);
      const admins = groupDoc.data().admins.filter(id => id !== userId);

      await groupRef.update({
        participants,
        admins,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Make user admin
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   */
  static async makeAdmin(groupId, userId) {
    const groupRef = db.collection('groups').doc(groupId);
    const groupDoc = await groupRef.get();

    if (groupDoc.exists) {
      const admins = groupDoc.data().admins || [];
      if (!admins.includes(userId)) {
        await groupRef.update({
          admins: [...admins, userId],
        });
      }
    }
  }

  /**
   * Update group settings
   * @param {string} groupId - Group ID
   * @param {Object} settings - Settings to update
   */
  static async updateSettings(groupId, settings) {
    await db.collection('groups').doc(groupId).update({
      settings,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Enable/Disable AI Bot
   * @param {string} groupId - Group ID
   * @param {boolean} enabled - Enable or disable
   */
  static async toggleAIBot(groupId, enabled) {
    const groupRef = db.collection('groups').doc(groupId);
    const groupDoc = await groupRef.get();

    if (groupDoc.exists) {
      const aiBot = groupDoc.data().aiBot || {};
      await groupRef.update({
        aiBot: {
          ...aiBot,
          enabled,
        },
        updatedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Delete group
   * @param {string} groupId - Group ID
   */
  static async delete(groupId) {
    await db.collection('groups').doc(groupId).delete();
  }

  /**
   * Search groups by name
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Matching groups
   */
  static async search(searchTerm) {
    const snapshot = await db
      .collection('groups')
      .where('name', '>=', searchTerm)
      .where('name', '<=', searchTerm + '\uf8ff')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  }
}

module.exports = Group;
