const User = require('../models/User');

const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const users = await User.find({
      _id: { $ne: req.user.id },
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    }).select('username email avatar isOnline');

    res.status(200).json({ users });
  } catch (err) {
    next(err);
  }
};

module.exports = { searchUsers };