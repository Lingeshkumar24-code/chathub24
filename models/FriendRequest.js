/**
 * FriendRequest Model
 * Handles friend request operations
 */

const { db } = require('../config/firebase');

class FriendRequest {
  /**
   * Create a new friend request
   * @param {string} senderId - User ID of sender
   * @param {string} receiverEmail - Email of receiver
   * @returns {Promise<Object>} Created friend request
   */
  static async create(senderId, receiverEmail) {
    try {
      // Get receiver by email
      const receiverSnapshot = await db
        .collection('users')
        .where('email', '==', receiverEmail)
        .get();

      if (receiverSnapshot.empty) {
        throw new Error('User with this email not found');
      }

      const receiverDoc = receiverSnapshot.docs[0];
      const receiverId = receiverDoc.id;

      // Check if request already exists
      const existingRequest = await db
        .collection('friendRequests')
        .where('senderId', '==', senderId)
        .where('receiverId', '==', receiverId)
        .get();

      if (!existingRequest.empty) {
        throw new Error('Friend request already sent to this user');
      }

      // Check if already friends
      const senderData = await db.collection('users').doc(senderId).get();
      const senderFriends = senderData.data().friends || [];

      if (senderFriends.includes(receiverId)) {
        throw new Error('Already friends with this user');
      }

      const requestDoc = {
        senderId,
        receiverId,
        senderEmail: (await db.collection('users').doc(senderId).get()).data().email,
        senderUsername: (await db.collection('users').doc(senderId).get()).data().username,
        receiverEmail,
        status: 'pending', // pending, accepted, rejected
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await db.collection('friendRequests').add(requestDoc);
      return { id: docRef.id, ...requestDoc };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get pending friend requests for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of friend requests
   */
  static async getPendingRequests(userId) {
    const snapshot = await db
      .collection('friendRequests')
      .where('receiverId', '==', userId)
      .where('status', '==', 'pending')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  /**
   * Accept friend request
   * @param {string} requestId - Friend request ID
   * @param {string} userId - User ID (receiver)
   * @returns {Promise<Object>} Updated request
   */
  static async acceptRequest(requestId, userId) {
    try {
      const requestDoc = await db.collection('friendRequests').doc(requestId).get();

      if (!requestDoc.exists) {
        throw new Error('Friend request not found');
      }

      const request = requestDoc.data();

      if (request.receiverId !== userId) {
        throw new Error('Unauthorized action');
      }

      // Add friend to both users
      const senderRef = db.collection('users').doc(request.senderId);
      const receiverRef = db.collection('users').doc(userId);

      const senderData = await senderRef.get();
      const receiverData = await receiverRef.get();

      const senderFriends = senderData.data().friends || [];
      const receiverFriends = receiverData.data().friends || [];

      // Update friend lists
      await senderRef.update({
        friends: [...new Set([...senderFriends, userId])],
        updatedAt: new Date().toISOString(),
      });

      await receiverRef.update({
        friends: [...new Set([...receiverFriends, request.senderId])],
        updatedAt: new Date().toISOString(),
      });

      // Update request status
      await db.collection('friendRequests').doc(requestId).update({
        status: 'accepted',
        updatedAt: new Date().toISOString(),
      });

      return {
        id: requestId,
        ...request,
        status: 'accepted',
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reject friend request
   * @param {string} requestId - Friend request ID
   * @param {string} userId - User ID (receiver)
   * @returns {Promise<Object>} Updated request
   */
  static async rejectRequest(requestId, userId) {
    try {
      const requestDoc = await db.collection('friendRequests').doc(requestId).get();

      if (!requestDoc.exists) {
        throw new Error('Friend request not found');
      }

      const request = requestDoc.data();

      if (request.receiverId !== userId) {
        throw new Error('Unauthorized action');
      }

      // Update request status
      await db.collection('friendRequests').doc(requestId).update({
        status: 'rejected',
        updatedAt: new Date().toISOString(),
      });

      return {
        id: requestId,
        ...request,
        status: 'rejected',
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's friends list
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of friends
   */
  static async getFriends(userId) {
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const friendIds = userDoc.data().friends || [];

    if (friendIds.length === 0) {
      return [];
    }

    const friendsData = [];

    for (const friendId of friendIds) {
      const friendDoc = await db.collection('users').doc(friendId).get();
      if (friendDoc.exists) {
        const { password, ...friendWithoutPassword } = friendDoc.data();
        friendsData.push({ id: friendId, ...friendWithoutPassword });
      }
    }

    return friendsData;
  }

  /**
   * Remove friend
   * @param {string} userId - User ID
   * @param {string} friendId - Friend ID to remove
   * @returns {Promise<void>}
   */
  static async removeFriend(userId, friendId) {
    try {
      const userRef = db.collection('users').doc(userId);
      const friendRef = db.collection('users').doc(friendId);

      const userData = await userRef.get();
      const friendData = await friendRef.get();

      const userFriends = userData.data().friends || [];
      const friendFriends = friendData.data().friends || [];

      // Remove from both friend lists
      await userRef.update({
        friends: userFriends.filter(id => id !== friendId),
        updatedAt: new Date().toISOString(),
      });

      await friendRef.update({
        friends: friendFriends.filter(id => id !== userId),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = FriendRequest;
