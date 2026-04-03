const express = require('express');
const router = express.Router();
const {
  createOrGetConversation,
  createGroupConversation,
  getMyConversations,
  sendMessage,
  getMessages,
  deleteMessage,
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.post('/conversation', createOrGetConversation);
router.post('/group', createGroupConversation);
router.get('/conversations', getMyConversations);
router.post('/message', sendMessage);
router.get('/messages/:conversationId', getMessages);
router.delete('/message/:messageId', deleteMessage);

module.exports = router;