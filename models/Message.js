/**
 * Message Model
 * Handles message-related database operations
 */

const { db } = require('../config/firebase');

class Message {
  /**
   * Create a new message
   * @param {string} chatId - Chat/Room ID (private or group)
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} Created message
   */
  static async create(chatId, messageData) {
    const { sender, content, type = 'text', mentions = [] } = messageData;

    const messageDoc = {
      chatId,
      sender,
      content,
      type, // 'text', 'image', 'ai_response'
      mentions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reactions: {},
      isEdited: false,
      seenBy: [sender],
    };

    const docRef = await db.collection('messages').add(messageDoc);
    return { id: docRef.id, ...messageDoc };
  }

  /**
   * Get messages for a chat/room
   * @param {string} chatId - Chat ID
   * @param {number} limit - Number of messages to fetch
   * @returns {Promise<Array>} Messages
   */
  static async getMessagesByChat(chatId, limit = 50) {
    const snapshot = await db
      .collection('messages')
      .where('chatId', '==', chatId)
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
        return leftDate - rightDate;
      });
  }

  /**
   * Mark message as seen by user
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID
   */
  static async markAsSeen(messageId, userId) {
    const messageRef = db.collection('messages').doc(messageId);
    const messageDoc = await messageRef.get();

    if (messageDoc.exists) {
      const seenBy = messageDoc.data().seenBy || [];
      if (!seenBy.includes(userId)) {
        await messageRef.update({
          seenBy: [...seenBy, userId],
        });
      }
    }
  }

  /**
   * Add reaction to message
   * @param {string} messageId - Message ID
   * @param {string} emoji - Emoji reaction
   * @param {string} userId - User ID
   */
  static async addReaction(messageId, emoji, userId) {
    const messageRef = db.collection('messages').doc(messageId);
    const messageDoc = await messageRef.get();

    if (messageDoc.exists) {
      const reactions = messageDoc.data().reactions || {};
      reactions[emoji] = reactions[emoji] || [];

      if (!reactions[emoji].includes(userId)) {
        reactions[emoji].push(userId);
      }

      await messageRef.update({ reactions });
    }
  }

  /**
   * Edit message
   * @param {string} messageId - Message ID
   * @param {string} newContent - New message content
   */
  static async edit(messageId, newContent) {
    await db.collection('messages').doc(messageId).update({
      content: newContent,
      isEdited: true,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Delete message
   * @param {string} messageId - Message ID
   */
  static async delete(messageId) {
    await db.collection('messages').doc(messageId).delete();
  }

  /**
   * Get last message in chat
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Last message
   */
  static async getLastMessage(chatId) {
    const snapshot = await db
      .collection('messages')
      .where('chatId', '==', chatId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs
      .map(item => ({
        id: item.id,
        ...item.data(),
      }))
      .sort((left, right) => {
        const leftDate = new Date(left.createdAt || 0).getTime();
        const rightDate = new Date(right.createdAt || 0).getTime();
        return rightDate - leftDate;
      })[0];
    return doc;
  }

  /**
   * Search messages in chat
   * @param {string} chatId - Chat ID
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Matching messages
   */
  static async search(chatId, searchTerm) {
    const snapshot = await db
      .collection('messages')
      .where('chatId', '==', chatId)
      .where('content', '>=', searchTerm)
      .where('content', '<=', searchTerm + '\uf8ff')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  }
}

module.exports = Message;
