const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// CORS config -- defined once, used everywhere
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  process.env.CLIENT_URL
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Request from this origin is not allowed"));
    }
  },
  credentials: true
};

// Socket.IO -- defined once
const io = new Server(server, {
  cors: corsOptions
});

// Middleware
app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Socket events
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('user:online', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('users:online', Array.from(onlineUsers.keys()));
    console.log(`${userId} is online`);
  });

  socket.on('conversation:join', (conversationId) => {
    socket.join(conversationId);
  });

  socket.on('conversation:leave', (conversationId) => {
    socket.leave(conversationId);
  });

  socket.on('message:send', (message) => {
    io.to(message.conversation).emit('message:receive', message);
  });

  socket.on('typing:start', ({ conversationId, userId, username }) => {
    socket.to(conversationId).emit('typing:start', { userId, username });
  });

  socket.on('typing:stop', ({ conversationId, userId }) => {
    socket.to(conversationId).emit('typing:stop', { userId });
  });

  socket.on('disconnect', () => {
    onlineUsers.forEach((socketId, userId) => {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        io.emit('users:online', Array.from(onlineUsers.keys()));
        console.log(`${userId} went offline`);
      }
    });
  });
});

app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);

// Error Handler
app.use(errorHandler);

// DB + Server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    server.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on http://localhost:${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => console.error('DB connection failed:', err));