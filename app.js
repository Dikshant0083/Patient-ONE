// ===================================================================
// FILE: app.js (FINAL FIXED HTTPS VERSION WITH SOCKET.IO CHAT)
// ===================================================================

require('dotenv').config();
const express = require('express');
const path = require('path');
const socketIO = require('socket.io');
const http = require('http');              // ✅ added
const fs = require('fs');
const https = require('https');            // ✅ added
// Import configuration
const { connectDatabase } = require('./config/database');
const { configureMiddlewares } = require('./config/middlewares');
const { configurePassport } = require('./config/passport');

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const patientRoutes = require('./routes/patient');
const doctorRoutes = require('./routes/doctor');
const recordRoutes = require('./routes/records');
const chatRoutes = require('./routes/chat');

// Models & utils
const Message = require('./models/Message');
const { errorHandler } = require('./utils/errorHandler');

const app = express();

// ===================================================================
// SERVER CREATION (ONLY CHANGE REQUIRED FOR DEPLOY)
// ===================================================================
// ===================================================================
// SERVER (HTTPS locally, HTTP on Render)
// ===================================================================
let server;

if (process.env.NODE_ENV === 'production') {
    // Render handles HTTPS automatically
    server = require('http').createServer(app);
} else {
    // Local HTTPS for teacher requirement
    const sslOptions = {
        key: fs.readFileSync("c:\\certs\\localhostkey.pem"),
        cert: fs.readFileSync("c:\\certs\\localhostcert.pem")
    };
    server = https.createServer(sslOptions, app);
}


// Attach socket.io to server
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// ===================================================================
// Middleware & Setup
// ===================================================================
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Connect to DB
if (process.env.NODE_ENV !== 'test') {
    connectDatabase();
}

// Express session, flash, passport, body-parser, etc.
configureMiddlewares(app);

// Passport config
configurePassport();

// Share session with socket.io
const sessionMiddleware = app.get('sessionMiddleware');
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

// ===================================================================
// Socket.IO Chat Logic (UNCHANGED)
// ===================================================================
const onlineUsers = {};

io.on('connection', (socket) => {
    const userId = socket.request.session.passport?.user;
    if (!userId) return;

    onlineUsers[userId] = socket.id;

    socket.on('join_room', ({ roomId }) => {
        socket.join(roomId);
    });

    socket.on('send_message', async ({ from, to, message, roomId, replyTo, replyToText }) => {
        try {
            const newMsg = await Message.create({
                from,
                to,
                text: message,
                roomId,
                replyTo: replyTo || null,
                replyToText: replyToText || null
            });

            io.to(roomId).emit('receive_message', {
                _id: newMsg._id,
                from,
                to,
                message,
                createdAt: newMsg.createdAt,
                replyTo: newMsg.replyTo,
                replyToText: newMsg.replyToText
            });
        } catch (err) {
            console.error("Error saving message:", err);
        }
    });

    socket.on('edit_message', async ({ messageId, newText, roomId }) => {
        try {
            const message = await Message.findById(messageId);
            if (!message) return socket.emit('error', { message: 'Message not found' });

            if (message.from.toString() !== userId.toString()) {
                return socket.emit('error', { message: 'Unauthorized' });
            }

            message.text = newText;
            message.edited = true;
            await message.save();

            io.to(roomId).emit('message_edited', { messageId, newText });
        } catch (err) {
            socket.emit('error', { message: 'Failed to edit message' });
        }
    });

    socket.on('delete_message', async ({ messageId, roomId }) => {
        try {
            const message = await Message.findById(messageId);
            if (!message) return socket.emit('error', { message: 'Message not found' });

            if (message.from.toString() !== userId.toString()) {
                return socket.emit('error', { message: 'Unauthorized' });
            }

            await Message.findByIdAndDelete(messageId);
            io.to(roomId).emit('message_deleted', { messageId });
        } catch (err) {
            socket.emit('error', { message: 'Failed to delete message' });
        }
    });

    socket.on('clear_chat', async ({ roomId }) => {
        try {
            await Message.deleteMany({ roomId });
            io.to(roomId).emit('chat_cleared');
        } catch (err) {
            socket.emit('error', { message: 'Failed to clear chat' });
        }
    });

    socket.on('disconnect', () => {
        delete onlineUsers[userId];
    });
});

// ===================================================================
// Routes (UNCHANGED)
// ===================================================================
app.get('/', (req, res) => {
    res.render('index', {
        title: 'Welcome - Doctor-Patient Hub',
        appName: 'Doctor-Patient Hub',
    });
});

app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/patient', patientRoutes);
app.use('/doctor', doctorRoutes);
app.use('/records', recordRoutes);
app.use('/chat', chatRoutes);

// Errors
app.use(errorHandler);

// ===================================================================
// Start Server (UNCHANGED LOGIC)
// ===================================================================
if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

module.exports = app;
