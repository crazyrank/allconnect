const express = require('express');
const User = require('../models/User');
const router = express.Router();

router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalUsers, onlineUsers, newUsersToday] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: "online" }),
      User.countDocuments({ createdAt: { $gte: startOfDay } }),
    ]);

    res.json({
      totalUsers,
      onlineUsers,
      offlineUsers: totalUsers - onlineUsers,
      newUsersToday,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

module.exports = router;