/**
 * Group Controller
 * Handles group chat operations including AI Bot management
 */

const Group = require('../models/Group');
const Message = require('../models/Message');
const User = require('../models/User');

/**
 * Create a new group
 * POST /api/groups
 */
exports.createGroup = async (req, res) => {
  try {
    const { name, description, participants = [] } = req.body;
    const creator = req.user.id;

    if (!name) {
      return res.status(400).json({ message: 'Group name required' });
    }

    const group = await Group.create({
      name,
      description,
      creator,
      participants,
    });

    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Error creating group' });
  }
};

/**
 * Get all groups for current user
 * GET /api/groups
 */
exports.getUserGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    const groups = await Group.getUserGroups(userId);

    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Error fetching groups' });
  }
};

/**
 * Get group details
 * GET /api/groups/:groupId
 */
exports.getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.getById(groupId);

    res.json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ message: 'Error fetching group' });
  }
};

/**
 * Get messages for a group
 * GET /api/groups/:groupId/messages?limit=50
 */
exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const messages = await Message.getMessagesByChat(groupId, limit);

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
 * Send message to group
 * POST /api/groups/:groupId/messages
 */
exports.sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content, type = 'text' } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ message: 'Message content required' });
    }

    // Verify user is part of the group
    const group = await Group.getById(groupId);
    if (!group.participants.includes(userId)) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    // Create message
    const message = await Message.create(groupId, {
      sender: userId,
      content,
      type,
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
};

/**
 * Add participant to group
 * POST /api/groups/:groupId/participants
 */
exports.addParticipant = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    // Verify requester is admin
    const group = await Group.getById(groupId);
    const isAdmin = group.admins.includes(req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can add participants' });
    }

    await Group.addParticipant(groupId, userId);

    res.json({ message: 'Participant added' });
  } catch (error) {
    console.error('Error adding participant:', error);
    res.status(500).json({ message: 'Error adding participant' });
  }
};

/**
 * Remove participant from group
 * DELETE /api/groups/:groupId/participants/:userId
 */
exports.removeParticipant = async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    // Verify requester is admin
    const group = await Group.getById(groupId);
    const isAdmin = group.admins.includes(req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can remove participants' });
    }

    await Group.removeParticipant(groupId, userId);

    res.json({ message: 'Participant removed' });
  } catch (error) {
    console.error('Error removing participant:', error);
    res.status(500).json({ message: 'Error removing participant' });
  }
};

/**
 * Make user admin
 * POST /api/groups/:groupId/admins/:userId
 */
exports.makeAdmin = async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    // Verify requester is admin
    const group = await Group.getById(groupId);
    const isAdmin = group.admins.includes(req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can make admins' });
    }

    await Group.makeAdmin(groupId, userId);

    res.json({ message: 'User is now admin' });
  } catch (error) {
    console.error('Error making admin:', error);
    res.status(500).json({ message: 'Error making admin' });
  }
};

/**
 * Toggle AI Bot
 * PUT /api/groups/:groupId/ai-bot
 */
exports.toggleAIBot = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { enabled } = req.body;

    // Verify requester is admin
    const group = await Group.getById(groupId);
    const isAdmin = group.admins.includes(req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can control AI Bot' });
    }

    await Group.toggleAIBot(groupId, enabled);

    res.json({ message: `AI Bot ${enabled ? 'enabled' : 'disabled'}` });
  } catch (error) {
    console.error('Error toggling AI Bot:', error);
    res.status(500).json({ message: 'Error toggling AI Bot' });
  }
};

/**
 * Delete group
 * DELETE /api/groups/:groupId
 */
exports.deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Verify requester is creator
    const group = await Group.getById(groupId);
    if (group.creator !== req.user.id) {
      return res.status(403).json({ message: 'Only creator can delete group' });
    }

    await Group.delete(groupId);

    res.json({ message: 'Group deleted' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ message: 'Error deleting group' });
  }
};

module.exports = exports;
