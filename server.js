/**
 * Main Server File
 * Initializes Express, Socket.io, and all routes
 * Handles real-time messaging and AI integration
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

// Import routes
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const groupRoutes = require('./routes/groupRoutes');
const userRoutes = require('./routes/userRoutes');
const friendRequestRoutes = require('./routes/friendRequestRoutes');

// Import services
const AIService = require('./services/ai');
const OfflineReplyService = require('./services/offlineReplyService');
const Message = require('./models/Message');
const Group = require('./models/Group');
const User = require('./models/User');

// Load environment variables
dotenv.config();

// Initialize Express and Socket.io
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/friend-requests', friendRequestRoutes);

app.get('/', (req, res) => {
  res.json({
    status: 'Server is running',
    service: 'chathub24-backend',
    health: '/api/health',
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Socket.io Events
const userSockets = {}; // Map userId to socketId
const userSocketConnections = {}; // Map userId to active socket ids
const typingUsers = {}; // Track typing users

io.on('connection', socket => {
  console.log(`User connected: ${socket.id}`);

  const connectedUserId = socket.handshake.auth?.userId;
  if (connectedUserId) {
    socket.data.userId = connectedUserId;
    userSocketConnections[connectedUserId] = userSocketConnections[connectedUserId] || new Set();
    userSocketConnections[connectedUserId].add(socket.id);
    User.updateStatus(connectedUserId, 'online').catch(error => {
      console.error('Error updating user online status:', error);
    });
  }

  /**
   * User joins chat/group room
   */
  socket.on('join-room', data => {
    const { roomId, userId } = data;
    socket.join(roomId);
    userSockets[userId] = socket.id;
    socket.data.userId = userId;

    userSocketConnections[userId] = userSocketConnections[userId] || new Set();
    userSocketConnections[userId].add(socket.id);
    User.updateStatus(userId, 'online').catch(error => {
      console.error('Error updating user online status:', error);
    });

    // Notify others that user is online
    socket.to(roomId).emit('user-online', {
      userId,
      status: 'online',
    });

    console.log(`User ${userId} joined room ${roomId}`);
  });

  /**
   * Leave room
   */
  socket.on('leave-room', data => {
    const { roomId, userId } = data;
    socket.leave(roomId);
    delete userSockets[userId];

    io.to(roomId).emit('user-offline', {
      userId,
      status: 'offline',
    });

    console.log(`User ${userId} left room ${roomId}`);
  });

  /**
   * User is typing
   */
  socket.on('typing', data => {
    const { roomId, userId, username } = data;
    typingUsers[roomId] = typingUsers[roomId] || {};
    typingUsers[roomId][userId] = { username, typing: true };

    socket.to(roomId).emit('user-typing', {
      userId,
      username,
    });
  });

  /**
   * User stopped typing
   */
  socket.on('stop-typing', data => {
    const { roomId, userId } = data;
    if (typingUsers[roomId] && typingUsers[roomId][userId]) {
      delete typingUsers[roomId][userId];
    }

    socket.to(roomId).emit('user-stop-typing', {
      userId,
    });
  });

  /**
   * Send message in real-time
   */
  socket.on('send-message', async (data, callback) => {
    const { roomId, message } = data;

    try {
      // Create message in database
      const newMessage = await Message.create(roomId, {
        sender: message.sender,
        content: message.content,
        type: 'text',
      });

      // Emit message to room
      io.to(roomId).emit('receive-message', newMessage);

      if (typeof callback === 'function') {
        callback({ success: true, message: newMessage });
      }

      // Check if this is a private chat and recipient is offline
      // Get recipient info from roomId (private chats have userId1_userId2 format)
      const participants = roomId.split('_');
      if (participants.length === 2) {
        const senderId = message.senderId || message.sender;
        const recipientId = participants[0] === senderId ? participants[1] : participants[0];

        try {
          // Check if recipient is offline and has auto-reply enabled
          const recipient = await User.getById(recipientId);
          
          if (recipient.status === 'offline') {
            const shouldAutoReply = await OfflineReplyService.shouldAutoReply(recipientId);
            
            if (shouldAutoReply) {
              // Send offline AI reply
              const replyResult = await OfflineReplyService.handleOfflineMessage(
                recipientId,
                senderId,
                message.content
              );
              
              if (replyResult.success) {
                console.log(`Auto-reply sent to ${senderId} for offline user ${recipientId}`);
              }
            }
          }
        } catch (error) {
          console.error('Error checking offline status:', error);
        }
      }

      // Check if AI should respond (for group chats)
      const isAIBotMentioned = AIService.isMentioningAI(message.content);

      if (isAIBotMentioned) {
        try {
          // Get group info
          const group = await Group.getById(roomId);

          // Check if AI bot is enabled
          if (!group.aiBot || !group.aiBot.enabled) {
            return;
          }

          // Get conversation history for context
          const recentMessages = await Message.getMessagesByChat(roomId, 10);

          // Clean the message (remove @ai mention)
          const cleanMessage = AIService.extractCleanMessage(message.content);

          // Generate AI response
          const aiResponse = await AIService.generateResponse(
            cleanMessage,
            recentMessages,
            group.name,
          );

          // Save AI message to database
          const aiMessage = await Message.create(roomId, {
            sender: 'ChatBot AI',
            content: aiResponse,
            type: 'ai_response',
            mentions: [],
          });

          // Emit AI message to room
          io.to(roomId).emit('receive-message', aiMessage);
        } catch (error) {
          console.error('Error generating AI response:', error);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Error sending message' });

      if (typeof callback === 'function') {
        callback({ success: false, message: 'Error sending message' });
      }
    }
  });

  /**
   * AI Summarize request
   */
  socket.on('ai-summarize', async data => {
    const { roomId } = data;

    try {
      const group = await Group.getById(roomId);
      const messages = await Message.getMessagesByChat(roomId, 50);

      const summary = await AIService.summaryzeConversation(messages, group.name);

      socket.emit('ai-summary', {
        summary,
      });
    } catch (error) {
      console.error('Error generating summary:', error);
      socket.emit('error', { message: 'Error generating summary' });
    }
  });

  /**
   * AI Suggestions request
   */
  socket.on('ai-suggestions', async data => {
    const { topic } = data;

    try {
      const suggestions = await AIService.getSuggestions(topic);

      socket.emit('ai-suggestions', {
        suggestions,
      });
    } catch (error) {
      console.error('Error generating suggestions:', error);
      socket.emit('error', { message: 'Error generating suggestions' });
    }
  });

  /**
   * Disconnect
   */
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    const disconnectedUserId = socket.data.userId;

    // Remove user from tracking
    for (const userId in userSockets) {
      if (userSockets[userId] === socket.id) {
        delete userSockets[userId];
      }
    }

    if (disconnectedUserId && userSocketConnections[disconnectedUserId]) {
      userSocketConnections[disconnectedUserId].delete(socket.id);

      if (userSocketConnections[disconnectedUserId].size === 0) {
        delete userSocketConnections[disconnectedUserId];
        User.updateStatus(disconnectedUserId, 'offline').catch(error => {
          console.error('Error updating user offline status:', error);
        });
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server, io };
