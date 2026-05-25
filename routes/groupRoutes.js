/**
 * Group Routes
 * POST /api/groups - Create group
 * GET /api/groups - Get user groups
 * GET /api/groups/:groupId - Get group details
 * GET /api/groups/:groupId/messages - Get group messages
 * POST /api/groups/:groupId/messages - Send group message
 * POST /api/groups/:groupId/participants - Add participant
 * DELETE /api/groups/:groupId/participants/:userId - Remove participant
 * POST /api/groups/:groupId/admins/:userId - Make admin
 * PUT /api/groups/:groupId/ai-bot - Toggle AI Bot
 * DELETE /api/groups/:groupId - Delete group
 */

const express = require('express');
const groupController = require('../controllers/groupController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Create group
router.post('/', groupController.createGroup);

// Get user groups
router.get('/', groupController.getUserGroups);

// Get group details
router.get('/:groupId', groupController.getGroupDetails);

// Get group messages
router.get('/:groupId/messages', groupController.getGroupMessages);

// Send group message
router.post('/:groupId/messages', groupController.sendGroupMessage);

// Add participant
router.post('/:groupId/participants', groupController.addParticipant);

// Remove participant
router.delete('/:groupId/participants/:userId', groupController.removeParticipant);

// Make admin
router.post('/:groupId/admins/:userId', groupController.makeAdmin);

// Toggle AI Bot
router.put('/:groupId/ai-bot', groupController.toggleAIBot);

// Delete group
router.delete('/:groupId', groupController.deleteGroup);

module.exports = router;
