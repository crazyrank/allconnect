const jwt = require('jsonwebtoken');
const User = require('../models/User');
const axios = require('axios');
const logActivity = require('../utils/activityLogger');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already taken' });
    }

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const usernamePattern = /^[a-zA-Z0-9._%+-]{4,}$/;
    if (!usernamePattern.test(username)) {
      return res.status(400).json({ message: 'Invalid username format' });
    }

    const passwordPattern = /^[a-zA-Z0-9._%+-]{6,}$/;
    if (!passwordPattern.test(password)) {
      return res.status(400).json({ message: 'Password must include . _ % + - and must be not less than 7 characters' });
    }

    const user = await User.create({ username, email, password });
    const token = generateToken(user._id);

    await logActivity(req.app, user._id, 'register', { email });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isOnline: user.isOnline,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +role');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    await User.findByIdAndUpdate(user._id, { isOnline: true });
    const token = generateToken(user._id);

    // Get location from IP
    let location = 'Unknown';
    try {
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
      const cleanIp = ip === '::1' || ip === '127.0.0.1' ? null : ip;
      if (cleanIp) {
        const geoRes = await axios.get(`http://ip-api.com/json/${cleanIp}`);
        if (geoRes.data.status === 'success') {
          location = `${geoRes.data.city}, ${geoRes.data.country}`;
        }
      }
    } catch (_) {}

    await logActivity(req.app, user._id, 'login', { email, location });

    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isOnline: true,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      isOnline: false,
      lastSeen: Date.now(),
    });

    await logActivity(req.app, req.user.id, 'logout');

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, logout, getMe };