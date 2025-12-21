// ===================================================================
// FILE: app.js (FINAL FIXED HTTPS VERSION WITH SOCKET.IO CHAT)
// ===================================================================

require('dotenv').config();
const express = require('express');
const path = require('path');
const https = require('https');
const fs = require('fs');
const socketIO = require('socket.io');

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
// HTTPS SERVER (Teacher Required Format)
// ===================================================================
const sslOptions = {
    key: fs.readFileSync("c:\\certs\\localhostkey.pem"),
    cert: fs.readFileSync("c:\\certs\\localhostcert.pem")
};

const server = https.createServer(sslOptions, app);

// Attach socket.io to HTTPS server
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
// Socket.IO Chat Logic (Add this to your server.js or app.js)
// ===================================================================
const onlineUsers = {};

io.on('connection', (socket) => {
    const userId = socket.request.session.passport?.user;
    if (!userId) return;

    onlineUsers[userId] = socket.id;

    // Join room
    socket.on('join_room', ({ roomId }) => {
        socket.join(roomId);
    });

    // Send new message
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

            // Notify recipient if not in room
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
            console.error("Error saving message:", err);
        }
    });

    // Edit message
    socket.on('edit_message', async ({ messageId, newText, roomId }) => {
        try {
            const message = await Message.findById(messageId);
            
            if (!message) {
                return socket.emit('error', { message: 'Message not found' });
            }

            // Check if user owns the message
            if (message.from.toString() !== userId.toString()) {
                return socket.emit('error', { message: 'Unauthorized' });
            }

            message.text = newText;
            message.edited = true;
            await message.save();

            io.to(roomId).emit('message_edited', {
                messageId,
                newText
            });
        } catch (err) {
            console.error("Error editing message:", err);
            socket.emit('error', { message: 'Failed to edit message' });
        }
    });

    // Delete message
    socket.on('delete_message', async ({ messageId, roomId }) => {
        try {
            const message = await Message.findById(messageId);
            
            if (!message) {
                return socket.emit('error', { message: 'Message not found' });
            }

            // Check if user owns the message
            if (message.from.toString() !== userId.toString()) {
                return socket.emit('error', { message: 'Unauthorized' });
            }

            await Message.findByIdAndDelete(messageId);

            io.to(roomId).emit('message_deleted', {
                messageId
            });
        } catch (err) {
            console.error("Error deleting message:", err);
            socket.emit('error', { message: 'Failed to delete message' });
        }
    });

    // Clear entire chat
    socket.on('clear_chat', async ({ roomId }) => {
        try {
            await Message.deleteMany({ roomId });

            io.to(roomId).emit('chat_cleared');
        } catch (err) {
            console.error("Error clearing chat:", err);
            socket.emit('error', { message: 'Failed to clear chat' });
        }
    });

    socket.on('disconnect', () => {
        delete onlineUsers[userId];
    });
});

// ===================================================================
// Routes
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
// Start HTTPS Server
// ===================================================================
if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, () => {
        console.log(`🚀 HTTPS Secure server running at https://localhost:${PORT}`);
    });
}
module.exports = app;

