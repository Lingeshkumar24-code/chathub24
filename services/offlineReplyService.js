/**
 * Offline Reply Service
 * Handles AI-generated replies for offline users
 */

const AIService = require('./ai');
const EmailService = require('./emailService');
const OfflineAutoReply = require('../models/OfflineAutoReply');
const User = require('../models/User');
const Message = require('../models/Message');
const Chat = require('../models/Chat');

class OfflineReplyService {
  /**
   * Generate and send offline AI reply
   * @param {string} offlineUserId - ID of offline user
   * @param {string} senderId - ID of message sender
   * @param {string} message - Message content
   * @returns {Promise<Object>} Result with generated reply
   */
  static async handleOfflineMessage(chatId, offlineUserId, senderId, message) {
    try {
      // Get offline user settings
      const autoReplySettings = await OfflineAutoReply.getAutoReply(offlineUserId);

      if (!autoReplySettings.enabled) {
        return { success: false, message: 'Auto-reply is disabled for this user' };
      }

      // Get sender and offline user details
      const sender = await User.getById(senderId);
      const offlineUser = await User.getById(offlineUserId);

      // Generate AI response based on tone
      const systemPrompt = this.getSystemPrompt(autoReplySettings.tone, offlineUser.username);
      const aiResponse = await this.generateOfflineReply(message, systemPrompt);

      // Send email reply
      const emailResult = await EmailService.sendOfflineReplyEmail(
        sender.email,
        sender.username,
        offlineUser.username,
        message,
        aiResponse
      );

      // Record the offline reply even if email delivery fails so the reply history remains visible.
      await OfflineAutoReply.recordOfflineReply(
        offlineUserId,
        senderId,
        sender.username,
        sender.email,
        message,
        aiResponse,
        emailResult.success
      );

      const botMessage = await Message.create(chatId, {
        sender: 'ChatBot AI',
        content: aiResponse,
        type: 'ai_response',
        mentions: [],
      });

      await Chat.updateLastMessage(chatId, aiResponse);

      return {
        success: true,
        aiResponse,
        botMessage,
        emailSent: emailResult.success,
      };
    } catch (error) {
      console.error('Error handling offline message:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate system prompt based on tone preference
   * @param {string} tone - Tone preference
   * @param {string} username - Username of offline user
   * @returns {string} System prompt
   */
  static getSystemPrompt(tone, username) {
    const basePrompt = `You are an AI assistant responding on behalf of ${username} who is currently offline.`;

    const tonePrompts = {
      professional: `${basePrompt} Keep your response professional, concise, and courteous. Acknowledge their message and let them know you'll respond when you return online.`,
      caring: `${basePrompt} Keep your response warm, empathetic, and caring. Show concern for the other person's message and let them know you will respond when you are back online.`,
      friendly: `${basePrompt} Keep your response warm, friendly, and approachable. Thank them for reaching out and let them know you'll get back to them soon.`,
      loving: `${basePrompt} Keep your response affectionate, gentle, and loving. Use a personal tone while still being respectful and clear that you will reply when you return online.`,
      casual: `${basePrompt} Keep your response casual and relaxed. You can use a conversational tone and brief language.`,
      formal: `${basePrompt} Keep your response formal and structured. Use appropriate salutations and maintain a professional tone throughout.`,
    };

    return tonePrompts[tone] || tonePrompts.professional;
  }

  /**
   * Generate AI offline reply using Groq API (Free - Online)
   * @param {string} userMessage - User's message
   * @param {string} systemPrompt - System prompt for AI
   * @returns {Promise<string>} AI response
   */
  static async generateOfflineReply(userMessage, systemPrompt) {
    try {
      if (!process.env.GROQ_API_KEY) {
        return 'Thank you for your message. I will respond when I return online.';
      }

      const Groq = require('groq-sdk');
      const GROQ_MODEL = 'llama-3.1-8b-instant';

      const groq = new Groq({
        apiKey: process.env.GROQ_API_KEY,
      });

      const response = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || 'Thank you for your message. I will respond when I return online.';
    } catch (error) {
      console.error('Error generating offline reply with Groq:', error);
      return 'Thank you for your message. I will respond when I return online.';
    }
  }

  /**
   * Check if user is offline and auto-reply is enabled
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if auto-reply should be triggered
   */
  static async shouldAutoReply(userId) {
    try {
      const user = await User.getById(userId);
      const autoReplySettings = await OfflineAutoReply.getAutoReply(userId);

      return user.status === 'offline' && autoReplySettings.enabled;
    } catch (error) {
      console.error('Error checking auto-reply eligibility:', error);
      return false;
    }
  }

  /**
   * Update auto-reply settings for user
   * @param {string} userId - User ID
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  static async updateAutoReplySettings(userId, settings) {
    try {
      return await OfflineAutoReply.setAutoReply(userId, settings);
    } catch (error) {
      console.error('Error updating auto-reply settings:', error);
      throw error;
    }
  }

  /**
   * Get auto-reply history for user
   * @param {string} userId - User ID
   * @param {number} limit - Number of replies to fetch
   * @returns {Promise<Array>} List of offline replies
   */
  static async getAutoReplyHistory(userId, limit = 50) {
    try {
      return await OfflineAutoReply.getOfflineReplies(userId, limit);
    } catch (error) {
      console.error('Error fetching auto-reply history:', error);
      throw error;
    }
  }

  /**
   * Clear auto-reply history
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  static async clearAutoReplyHistory(userId) {
    try {
      const replies = await OfflineAutoReply.getOfflineReplies(userId, 1000);
      for (const reply of replies) {
        await OfflineAutoReply.deleteOfflineReply(reply.id);
      }
    } catch (error) {
      console.error('Error clearing auto-reply history:', error);
      throw error;
    }
  }
}

module.exports = OfflineReplyService;
