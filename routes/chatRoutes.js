/**
 * Chat Routes (Private Chat)
 * POST /api/chats/private/:otherUserId - Get or create private chat
 * GET /api/chats - Get all user chats
 * GET /api/chats/:chatId - Get chat details
 * GET /api/chats/:chatId/messages - Get chat messages
 * POST /api/chats/:chatId/messages - Send message
 * PUT /api/messages/:messageId/seen - Mark message as seen
 * PUT /api/messages/:messageId - Edit message
 * DELETE /api/messages/:messageId - Delete message
 * DELETE /api/chats/:chatId - Delete chat
 */

const express = require('express');
const chatController = require('../controllers/chatController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get or create private chat with another user
router.post('/private/:otherUserId', chatController.getOrCreatePrivateChat);

// Get all user chats
router.get('/', chatController.getUserChats);

// Get chat details
router.get('/:chatId', chatController.getChatDetails);

// Get messages
router.get('/:chatId/messages', chatController.getChatMessages);

// Send message
router.post('/:chatId/messages', chatController.sendMessage);

// Mark message as seen
router.put('/messages/:messageId/seen', chatController.markMessageAsSeen);

// Edit message
router.put('/messages/:messageId', chatController.editMessage);

// Delete message
router.delete('/messages/:messageId', chatController.deleteMessage);

// Delete chat
router.delete('/:chatId', chatController.deleteChat);

module.exports = router;
