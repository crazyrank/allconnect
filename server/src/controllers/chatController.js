const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// @route POST /api/chat/conversation
const createOrGetConversation = async (req, res, next) => {
  try {
    const { receiverId } = req.body;
 
    let conversation = await Conversation.findOne({
      isGroup: false,
      members: { $all: [req.user.id, receiverId] },
    }).populate('members', '-password');

    if (conversation) {
      return res.status(200).json({ conversation });
    }
    
    conversation = await Conversation.create({
      members: [req.user.id, receiverId],
      isGroup: false,
    });

    conversation = await conversation.populate('members', '-password');

    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/chat/group
const createGroupConversation = async (req, res, next) => {
  try {
    const { name, members } = req.body;

    if (members.length < 2) {
      return res.status(400).json({ message: 'Group must have at least 2 members' });
    }

    const conversation = await Conversation.create({
      name,
      isGroup: true,
      members: [...members, req.user.id],
      admin: req.user.id,
    });

    const populated = await conversation.populate('members', '-password');

    res.status(201).json({ conversation: populated });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/chat/conversations
const getMyConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      members: { $in: [req.user.id] },
    })
      .populate('members', 'username avatar isOnline lastSeen')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.status(200).json({ conversations });
  } catch (err) {
    next(err);
  }
};

// @route POST /api/chat/message
const sendMessage = async (req, res, next) => {
  try {
    const { conversationId, content, mediaUrl, mediaType } = req.body;

    const message = await Message.create({
      sender: req.user.id,
      conversation: conversationId,
      content,
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || 'none',
    });

    // Update last message in conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
    });

    const populated = await message.populate('sender', 'username avatar');

    res.status(201).json({ message: populated });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/chat/messages/:conversationId
const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    const messages = await Message.find({
      conversation: conversationId,
      deletedFor: { $nin: [req.user.id] },
    })
      .populate('sender', 'username avatar')
      .sort({ createdAt: 1 });

    res.status(200).json({ messages });
  } catch (err) {
    next(err);
  }
};

// @route DELETE /api/chat/message/:messageId
const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    await Message.findByIdAndUpdate(messageId, {
      $push: { deletedFor: req.user.id },
    });

    res.status(200).json({ message: 'Message deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrGetConversation,
  createGroupConversation,
  getMyConversations,
  sendMessage,
  getMessages,
  deleteMessage,
};