/**
 * Friend Request Controller
 * Handles friend request operations
 */

const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const EmailService = require('../services/emailService');

/**
 * Send friend request via email
 * POST /api/friend-requests/send
 */
exports.sendFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { recipientEmail } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ message: 'Recipient email is required' });
    }

    const sender = await User.getById(userId);

    const recipientSnapshot = await require('../config/firebase').db
      .collection('users')
      .where('email', '==', recipientEmail)
      .get();

    if (recipientSnapshot.empty) {
      return res.status(404).json({ message: 'No user found with that email address' });
    }

    const recipientName = recipientSnapshot.docs[0].data().username;

    // Create friend request in database
    const friendRequest = await FriendRequest.create(userId, recipientEmail);

    // Send friend request email
    const emailResult = await EmailService.sendFriendRequestEmail(
      sender.username,
      recipientEmail,
      recipientName
    );

    if (!emailResult.success) {
      console.warn('Email failed to send but request was created:', emailResult.error);
    }

    res.status(201).json({
      message: 'Friend request sent successfully',
      friendRequest,
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ message: error.message || 'Error sending friend request' });
  }
};

/**
 * Get pending friend requests
 * GET /api/friend-requests/pending
 */
exports.getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await FriendRequest.getPendingRequests(userId);

    res.json({
      message: 'Pending friend requests retrieved',
      requests,
    });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ message: 'Error fetching pending requests' });
  }
};

/**
 * Accept friend request
 * POST /api/friend-requests/:requestId/accept
 */
exports.acceptFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const updatedRequest = await FriendRequest.acceptRequest(requestId, userId);

    res.json({
      message: 'Friend request accepted',
      request: updatedRequest,
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ message: error.message || 'Error accepting friend request' });
  }
};

/**
 * Reject friend request
 * POST /api/friend-requests/:requestId/reject
 */
exports.rejectFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const updatedRequest = await FriendRequest.rejectRequest(requestId, userId);

    res.json({
      message: 'Friend request rejected',
      request: updatedRequest,
    });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    res.status(500).json({ message: error.message || 'Error rejecting friend request' });
  }
};

/**
 * Get user's friends list
 * GET /api/friend-requests/friends
 */
exports.getFriends = async (req, res) => {
  try {
    const userId = req.user.id;

    const friends = await FriendRequest.getFriends(userId);

    res.json({
      message: 'Friends list retrieved',
      friends,
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ message: 'Error fetching friends list' });
  }
};

/**
 * Remove friend
 * DELETE /api/friend-requests/:friendId
 */
exports.removeFriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;

    await FriendRequest.removeFriend(userId, friendId);

    res.json({
      message: 'Friend removed successfully',
    });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ message: 'Error removing friend' });
  }
};

/**
 * Get auto-reply settings
 * GET /api/friend-requests/auto-reply/settings
 */
exports.getAutoReplySettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const OfflineAutoReply = require('../models/OfflineAutoReply');

    const settings = await OfflineAutoReply.getAutoReply(userId);

    res.json({
      message: 'Auto-reply settings retrieved',
      settings,
    });
  } catch (error) {
    console.error('Error fetching auto-reply settings:', error);
    res.status(500).json({ message: 'Error fetching auto-reply settings' });
  }
};

/**
 * Update auto-reply settings
 * POST /api/friend-requests/auto-reply/settings
 */
exports.updateAutoReplySettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { enabled, tone, instructions } = req.body;
    const OfflineAutoReply = require('../models/OfflineAutoReply');

    const settings = await OfflineAutoReply.setAutoReply(userId, {
      enabled,
      tone: tone || 'professional',
      instructions,
    });

    res.json({
      message: 'Auto-reply settings updated',
      settings,
    });
  } catch (error) {
    console.error('Error updating auto-reply settings:', error);
    res.status(500).json({ message: 'Error updating auto-reply settings' });
  }
};

/**
 * Get offline reply history
 * GET /api/friend-requests/auto-reply/history
 */
exports.getOfflineReplyHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const OfflineAutoReply = require('../models/OfflineAutoReply');

    const replies = await OfflineAutoReply.getOfflineReplies(userId);

    res.json({
      message: 'Offline reply history retrieved',
      replies,
    });
  } catch (error) {
    console.error('Error fetching offline reply history:', error);
    res.status(500).json({ message: 'Error fetching offline reply history' });
  }
};
