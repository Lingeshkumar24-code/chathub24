/**
 * OfflineAutoReply Model
 * Handles automatic AI replies when user is offline
 */

const { db } = require('../config/firebase');

class OfflineAutoReply {
  /**
   * Create or update offline auto-reply settings
   * @param {string} userId - User ID
   * @param {Object} settings - { enabled, tone, instructions }
   * @returns {Promise<Object>} Auto-reply settings
   */
  static async setAutoReply(userId, settings) {
    try {
      const { enabled, tone = 'professional', instructions } = settings;

      const autoReplyRef = db.collection('offlineAutoReplies').doc(userId);

      const autoReplyDoc = {
        userId,
        enabled,
        tone, // professional, friendly, casual, formal
        instructions,
        createdAt: (await autoReplyRef.get()).exists
          ? (await autoReplyRef.get()).data().createdAt
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await autoReplyRef.set(autoReplyDoc, { merge: true });

      return {
        userId,
        ...autoReplyDoc,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get auto-reply settings
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Auto-reply settings
   */
  static async getAutoReply(userId) {
    try {
      const doc = await db.collection('offlineAutoReplies').doc(userId).get();

      if (!doc.exists) {
        return {
          userId,
          enabled: false,
          tone: 'professional',
          instructions: 'I am currently offline and will reply to your message when I return.',
        };
      }

      return { userId, ...doc.data() };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Record an offline reply sent to user
   * @param {string} userId - User ID (offline user)
   * @param {string} senderId - Sender ID
   * @param {string} senderName - Sender name
   * @param {string} senderEmail - Sender email
   * @param {string} originalMessage - Original message from sender
   * @param {string} aiResponse - AI generated response
   * @param {boolean} emailSent - Whether the email was delivered successfully
   * @returns {Promise<Object>} Reply record
   */
  static async recordOfflineReply(userId, senderId, senderName, senderEmail, originalMessage, aiResponse, emailSent = false) {
    try {
      const replyDoc = {
        userId,
        senderId,
        senderName,
        senderEmail,
        originalMessage,
        aiResponse,
        emailSent,
        createdAt: new Date().toISOString(),
      };

      const docRef = await db
        .collection('offlineReplies')
        .add(replyDoc);

      return { id: docRef.id, ...replyDoc };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get offline replies for a user
   * @param {string} userId - User ID
   * @param {number} limit - Limit number of replies
   * @returns {Promise<Array>} List of offline replies
   */
  static async getOfflineReplies(userId, limit = 50) {
    try {
      const snapshot = await db
        .collection('offlineReplies')
        .where('userId', '==', userId)
        .limit(limit)
        .get();

      return snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((left, right) => {
          const leftDate = new Date(left.createdAt || 0).getTime();
          const rightDate = new Date(right.createdAt || 0).getTime();
          return rightDate - leftDate;
        });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete an offline reply
   * @param {string} replyId - Reply ID
   * @returns {Promise<void>}
   */
  static async deleteOfflineReply(replyId) {
    try {
      await db.collection('offlineReplies').doc(replyId).delete();
    } catch (error) {
      throw error;
    }
  }
}

module.exports = OfflineAutoReply;
