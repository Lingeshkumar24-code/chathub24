/**
 * Friend Request Routes
 * Handles all friend request and offline reply endpoints
 */

const express = require('express');
const friendRequestController = require('../controllers/friendRequestController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * Friend Request Routes
 */

// Send friend request
router.post('/send', friendRequestController.sendFriendRequest);

// Get pending friend requests
router.get('/pending', friendRequestController.getPendingRequests);

// Accept friend request
router.post('/:requestId/accept', friendRequestController.acceptFriendRequest);

// Reject friend request
router.post('/:requestId/reject', friendRequestController.rejectFriendRequest);

// Get friends list
router.get('/friends/list', friendRequestController.getFriends);

// Remove friend
router.delete('/:friendId', friendRequestController.removeFriend);

/**
 * Auto-Reply Settings Routes
 */

// Get auto-reply settings
router.get('/auto-reply/settings', friendRequestController.getAutoReplySettings);

// Update auto-reply settings
router.post('/auto-reply/settings', friendRequestController.updateAutoReplySettings);

// Get offline reply history
router.get('/auto-reply/history', friendRequestController.getOfflineReplyHistory);

module.exports = router;
