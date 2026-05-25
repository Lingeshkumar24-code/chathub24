/**
 * AI Service
 * Handles AI-related operations using Groq API (Free - Online)
 */

const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const GROQ_MODEL = 'llama-3.1-8b-instant';

class AIService {
  /**
   * Generate AI response
   * @param {string} userMessage - User message
   * @param {Array} conversationHistory - Previous messages for context
   * @param {string} groupName - Group name (for context)
   * @returns {Promise<string>} AI response
   */
  static async generateResponse(userMessage, conversationHistory = [], groupName = 'Chat') {
    try {
      // Build conversation history for context
      const messages = [
        {
          role: 'system',
          content: `You are a helpful AI assistant in the "${groupName}" group chat. Be concise, friendly, and helpful. 
          Provide clear answers to questions, helpful suggestions, and summaries when asked. Always be respectful and appropriate.`,
        },
        ...conversationHistory.map(msg => ({
          role: msg.sender === 'ChatBot AI' ? 'assistant' : 'user',
          content: msg.content,
        })),
        {
          role: 'user',
          content: userMessage,
        },
      ];

      const response = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    } catch (error) {
      console.error('Error generating AI response:', error);
      return 'Sorry, I encountered an error while processing your request.';
    }
  }

  /**
   * Summarize conversation
   * @param {Array} messages - Messages to summarize
   * @param {string} groupName - Group name
   * @returns {Promise<string>} Summary
   */
  static async summaryzeConversation(messages, groupName = 'Chat') {
    try {
      const conversationText = messages
        .map(msg => `${msg.sender}: ${msg.content}`)
        .join('\n');

      const response = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful AI assistant. Summarize the following conversation in 2-3 concise bullet points.',
          },
          {
            role: 'user',
            content: `Please summarize this conversation from the "${groupName}" group:\n\n${conversationText}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.5,
      });

      return response.choices[0]?.message?.content || 'Could not generate summary.';
    } catch (error) {
      console.error('Error generating summary:', error);
      return 'Sorry, I could not generate a summary.';
    }
  }

  /**
   * Get AI suggestions for next questions
   * @param {string} topic - Current topic
   * @returns {Promise<Array>} List of suggestions
   */
  static async getSuggestions(topic) {
    try {
      const response = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Generate 3 helpful follow-up questions or suggestions as JSON array.',
          },
          {
            role: 'user',
            content: `Based on this topic: "${topic}", what are 3 helpful follow-up questions I could ask?`,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      });

      try {
        const text = response.choices[0]?.message?.content || '[]';
        // Extract JSON array from response
        const jsonMatch = text.match(/\[.*\]/s);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch (e) {
        return [];
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return [];
    }
  }

  /**
   * Check if message mentions AI
   * @param {string} content - Message content
   * @returns {boolean} True if message mentions AI
   */
  static isMentioningAI(content) {
    const aiMentionPatterns = [/@ai\b/i, /@chatbot\b/i, /@bot\b/i, /ai:/i, /chatbot:/i];
    return aiMentionPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Extract clean message (remove @ai mention)
   * @param {string} content - Message content
   * @returns {string} Clean message
   */
  static extractCleanMessage(content) {
    // Remove @ai, @chatbot, @bot mentions
    return content.replace(/@(ai|chatbot|bot)\b/gi, '').trim();
  }
}

module.exports = AIService;
