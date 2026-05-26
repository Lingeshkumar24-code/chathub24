/**
 * Chat Controller
 * Handles private chat operations
 */

const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const OfflineReplyService = require('../services/offlineReplyService');

/**
 * Get or create private chat
 * POST /api/chats/private/:otherUserId
 */
exports.getOrCreatePrivateChat = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.user.id;

    // Verify other user exists
    await User.getById(otherUserId);

    const chat = await Chat.getOrCreatePrivateChat(userId, otherUserId);

    res.json(chat);
  } catch (error) {
    console.error('Error getting private chat:', error);
    res.status(500).json({ message: 'Error getting chat' });
  }
};

/**
 * Get all chats for current user
 * GET /api/chats
 */
exports.getUserChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const chats = await Chat.getUserChats(userId);

    res.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ message: 'Error fetching chats' });
  }
};

/**
 * Get chat details
 * GET /api/chats/:chatId
 */
exports.getChatDetails = async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.getById(chatId);

    res.json(chat);
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ message: 'Error fetching chat' });
  }
};

/**
 * Get messages for a chat
 * GET /api/chats/:chatId/messages?limit=50&offset=0
 */
exports.getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const messages = await Message.getMessagesByChat(chatId, limit);

    res.json({
      count: messages.length,
      messages,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
};

/**
 * Send message to chat
 * POST /api/chats/:chatId/messages
 */
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, type = 'text' } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ message: 'Message content required' });
    }

    // Verify user is part of the chat
    const chat = await Chat.getById(chatId);
    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ message: 'Not a participant of this chat' });
    }

    // Create message
    const message = await Message.create(chatId, {
      sender: userId,
      content,
      type,
    });

    // Update chat's last message
    await Chat.updateLastMessage(chatId, content);

    let autoReplyMessage = null;

    const participants = chat.participants || [];
    if (participants.length === 2) {
      const recipientId = participants.find(participant => participant !== userId);
      if (recipientId) {
        const recipient = await User.getById(recipientId);

        if (recipient.status === 'offline') {
          const shouldAutoReply = await OfflineReplyService.shouldAutoReply(recipientId);

          if (shouldAutoReply) {
            const replyResult = await OfflineReplyService.handleOfflineMessage(
              chatId,
              recipientId,
              userId,
              content
            );

            if (replyResult.success && replyResult.botMessage) {
              autoReplyMessage = replyResult.botMessage;
            }
          }
        }
      }
    }

    res.status(201).json({
      message,
      autoReplyMessage,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
};

/**
 * Mark message as seen
 * PUT /api/messages/:messageId/seen
 */
exports.markMessageAsSeen = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    await Message.markAsSeen(messageId, userId);

    res.json({ message: 'Marked as seen' });
  } catch (error) {
    console.error('Error marking as seen:', error);
    res.status(500).json({ message: 'Error marking as seen' });
  }
};

/**
 * Delete message
 * DELETE /api/messages/:messageId
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    await Message.delete(messageId);

    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Error deleting message' });
  }
};

/**
 * Edit message
 * PUT /api/messages/:messageId
 */
exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Content required' });
    }

    await Message.edit(messageId, content);

    res.json({ message: 'Message updated' });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ message: 'Error editing message' });
  }
};

/**
 * Delete private chat
 * DELETE /api/chats/:chatId
 */
exports.deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    await Chat.delete(chatId);

    res.json({ message: 'Chat deleted' });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ message: 'Error deleting chat' });
  }
};

module.exports = exports;
