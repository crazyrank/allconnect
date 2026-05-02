const ActivityLog = require('../models/ActivityLog');

const logActivity = async (app, userId, action, metadata = {}) => {
  try {
    const log = await ActivityLog.create({ user: userId, action, metadata });
    const populated = await log.populate('user', 'username email avatar role');
    const io = app.get('io');
    if (io) io.emit('activity:new', populated);
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
};

module.exports = logActivity;