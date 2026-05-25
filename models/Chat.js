/**
 * Chat Model (Private Chat)
 * Handles private one-to-one chat operations
 */

const { db } = require('../config/firebase');

class Chat {
  /**
   * Create or get private chat between two users
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @returns {Promise<Object>} Chat document
   */
  static async getOrCreatePrivateChat(userId1, userId2) {
    // Create a consistent chat ID
    const sortedIds = [userId1, userId2].sort();
    const chatId = `${sortedIds[0]}_${sortedIds[1]}`;

    const chatRef = db.collection('chats').doc(chatId);
    const chatDoc = await chatRef.get();

    if (chatDoc.exists) {
      return { id: chatDoc.id, ...chatDoc.data() };
    }

    // Create new private chat
    const newChat = {
      type: 'private',
      participants: [userId1, userId2],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessage: null,
      lastMessageTime: null,
    };

    await chatRef.set(newChat);
    return { id: chatId, ...newChat };
  }

  /**
   * Get chat by ID
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Chat document
   */
  static async getById(chatId) {
    const doc = await db.collection('chats').doc(chatId).get();
    if (!doc.exists) {
      throw new Error('Chat not found');
    }
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Get all private chats for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of chats
   */
  static async getUserChats(userId) {
    const snapshot = await db
      .collection('chats')
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
   * Update chat's last message
   * @param {string} chatId - Chat ID
   * @param {string} lastMessage - Last message content
   */
  static async updateLastMessage(chatId, lastMessage) {
    await db.collection('chats').doc(chatId).update({
      lastMessage,
      lastMessageTime: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Delete private chat
   * @param {string} chatId - Chat ID
   */
  static async delete(chatId) {
    await db.collection('chats').doc(chatId).delete();
  }

  /**
   * Get unread message count for a chat
   * @param {string} chatId - Chat ID
   * @param {string} userId - User ID
   * @returns {Promise<number>} Unread message count
   */
  static async getUnreadCount(chatId, userId) {
    const snapshot = await db
      .collection('messages')
      .where('chatId', '==', chatId)
      .where('seenBy', 'array-contains', userId)
      .get();

    const totalMessages = await db
      .collection('messages')
      .where('chatId', '==', chatId)
      .get();

    return totalMessages.size - snapshot.size;
  }
}

module.exports = Chat;
