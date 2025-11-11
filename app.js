// ===================================================================
// FILE: app.js (FINAL FIXED VERSION WITH SOCKET.IO CHAT)
// ===================================================================


require('dotenv').config();
const express = require('express');
const path = require('path');
const https = require('https');          // ✅ changed from http to https
const fs = require('fs');                // ✅ needed for reading cert files
const socketIO = require('socket.io');   // ✅ socket.io import

// Import configuration and setup modules

const { connectDatabase } = require('./config/database');
const { configureMiddlewares } = require('./config/middlewares');
const { configurePassport } = require('./config/passport');

// Import route modules

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const patientRoutes = require('./routes/patient');
const doctorRoutes = require('./routes/doctor');
const recordRoutes = require('./routes/records');
const chatRoutes = require('./routes/chat');

// Import models/utilities

const Message = require('./models/Message');   // ✅ required for saving messages
const { errorHandler } = require('./utils/errorHandler');

const app = express();

// ✅ HTTPS server setup with SSL certificates
const keyPath = process.env.SSL_KEY_PATH || './certs/key.pem';
const certPath = process.env.SSL_CERT_PATH || './certs/cert.pem';

// Check if certificates exist, if not use HTTP as fallback
let server;
let io;

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
  server = https.createServer(options, app);
} else {
  console.warn('⚠️ SSL certificates not found. Falling back to HTTP.');
  console.warn('📌 To use HTTPS, generate certificates with:');
  console.warn('   mkdir certs');
  console.warn('   openssl req -x509 -newkey rsa:4096 -nodes -out certs/cert.pem -keyout certs/key.pem -days 365');
  const http = require('http');
  server = http.createServer(app);
}

io = socketIO(server);  // ✅ attach socket.io to server

const PORT = process.env.PORT || 3000;

// ============================
// Middleware & Setup
// ============================

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
connectDatabase();

// Configure middlewares (session, passport, flash, etc.)

configureMiddlewares(app);

// Configure Passport strategies

configurePassport();

// Share session with Socket.IO (important for identifying user)

const sessionMiddleware = app.get('sessionMiddleware');
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// ============================
// Socket.IO real-time chat
// ============================

const onlineUsers = {};    // { userId: socket.id }

io.on('connection', (socket) => {
  const userId = socket.request.session.passport?.user;
  if (!userId) return;

  onlineUsers[userId] = socket.id;

  // Join a room
  socket.on('join_room', ({ roomId }) => {
    socket.join(roomId);
  });

  // Send message
  socket.on('send_message', async ({ from, to, message, roomId }) => {
    try {
      // Save to DB
      const newMsg = await Message.create({ from, to, text: message, roomId });

      // Emit to all in the room
      io.to(roomId).emit('receive_message', {
        _id: newMsg._id,
        from,
        to,
        message,
        createdAt: newMsg.createdAt
      });

      // If recipient is online but NOT in the room → notify them
      const recipientSocket = onlineUsers[to];
      if (recipientSocket) {
        const rooms = io.sockets.sockets.get(recipientSocket).rooms;
        if (!rooms.has(roomId)) {
          io.to(recipientSocket).emit('new_message_notification', {
            from,
            message
          });
        }
      }
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('disconnect', () => {
    delete onlineUsers[userId];
  });
});

// ============================
// Routes
// ============================

// Home route
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Welcome - Doctor-Patient Hub',
    appName: 'Doctor-Patient Hub',
  });
});

// Mount route modules
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/patient', patientRoutes);
app.use('/doctor', doctorRoutes);
app.use('/records', recordRoutes);
app.use('/chat', chatRoutes);   // ✅ re-added chat route

// Error handler
app.use(errorHandler);

// ============================
// Start server
// ============================
server.listen(PORT, () => {
  console.log(`🚀 Secure server running at https://localhost:${PORT}`);
});