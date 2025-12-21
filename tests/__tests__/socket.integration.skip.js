// ===================================================================
// FILE: tests/__tests__/socket.test.js
// ===================================================================
const io = require('socket.io-client');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Message = require('../../models/Message');
const {
  createTestUser,
  createTestDoctor
} = require('../helpers/testHelpers');
const { generateRoomId } = require('../../utils/chatRoom');

describe('Socket.IO Chat', () => {
  let ioServer, serverSocket, clientSocket, httpServer;

  beforeAll((done) => {
    httpServer = createServer();
    ioServer = new Server(httpServer);
    
    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = io(`http://localhost:${port}`);
      
      ioServer.on('connection', (socket) => {
        serverSocket = socket;
      });
      
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    ioServer.close();
    clientSocket.close();
    httpServer.close();
  });

  describe('Join Room', () => {
    it('should allow user to join chat room', (done) => {
      const roomId = 'test_room_123';
      
      clientSocket.emit('join_room', { roomId });
      
      setTimeout(() => {
        expect(serverSocket.rooms.has(roomId)).toBe(true);
        done();
      }, 100);
    });
  });

  describe('Send Message', () => {
    it('should send and receive message', async (done) => {
      const patient = await createTestUser();
      const doctor = await createTestDoctor();
      const roomId = generateRoomId(patient._id, doctor._id);

      clientSocket.emit('join_room', { roomId });

      clientSocket.on('receive_message', (data) => {
        expect(data.message).toBe('Hello Doctor');
        expect(data.from).toBe(patient._id.toString());
        done();
      });

      setTimeout(() => {
        clientSocket.emit('send_message', {
          from: patient._id.toString(),
          to: doctor._id.toString(),
          message: 'Hello Doctor',
          roomId
        });
      }, 100);
    });

    it('should save message to database', async (done) => {
      const patient = await createTestUser();
      const doctor = await createTestDoctor();
      const roomId = generateRoomId(patient._id, doctor._id);

      clientSocket.emit('join_room', { roomId });

      clientSocket.emit('send_message', {
        from: patient._id.toString(),
        to: doctor._id.toString(),
        message: 'Test message',
        roomId
      });

      setTimeout(async () => {
        const message = await Message.findOne({ 
          text: 'Test message',
          roomId 
        });
        
        expect(message).toBeTruthy();
        expect(message.from.toString()).toBe(patient._id.toString());
        done();
      }, 200);
    });
  });

  describe('Edit Message', () => {
    it('should edit existing message', async (done) => {
      const patient = await createTestUser();
      const doctor = await createTestDoctor();
      const roomId = generateRoomId(patient._id, doctor._id);

      // Create original message
      const message = await Message.create({
        from: patient._id,
        to: doctor._id,
        text: 'Original text',
        roomId
      });

      clientSocket.emit('join_room', { roomId });

      clientSocket.on('message_edited', (data) => {
        expect(data.messageId).toBe(message._id.toString());
        expect(data.newText).toBe('Edited text');
        done();
      });

      setTimeout(() => {
        clientSocket.emit('edit_message', {
          messageId: message._id.toString(),
          newText: 'Edited text',
          roomId
        });
      }, 100);
    });

    it('should mark message as edited', async (done) => {
      const patient = await createTestUser();
      const doctor = await createTestDoctor();
      const roomId = generateRoomId(patient._id, doctor._id);

      const message = await Message.create({
        from: patient._id,
        to: doctor._id,
        text: 'Original text',
        roomId
      });

      clientSocket.emit('join_room', { roomId });

      clientSocket.emit('edit_message', {
        messageId: message._id.toString(),
        newText: 'Edited text',
        roomId
      });

      setTimeout(async () => {
        const updated = await Message.findById(message._id);
        expect(updated.text).toBe('Edited text');
        expect(updated.edited).toBe(true);
        done();
      }, 200);
    });
  });

  describe('Delete Message', () => {
    it('should delete message from database', async (done) => {
      const patient = await createTestUser();
      const doctor = await createTestDoctor();
      const roomId = generateRoomId(patient._id, doctor._id);

      const message = await Message.create({
        from: patient._id,
        to: doctor._id,
        text: 'To be deleted',
        roomId
      });

      clientSocket.emit('join_room', { roomId });

      clientSocket.on('message_deleted', (data) => {
        expect(data.messageId).toBe(message._id.toString());
      });

      clientSocket.emit('delete_message', {
        messageId: message._id.toString(),
        roomId
      });

      setTimeout(async () => {
        const deleted = await Message.findById(message._id);
        expect(deleted).toBeNull();
        done();
      }, 200);
    });
  });

  describe('Clear Chat', () => {
    it('should delete all messages in room', async (done) => {
      const patient = await createTestUser();
      const doctor = await createTestDoctor();
      const roomId = generateRoomId(patient._id, doctor._id);

      // Create multiple messages
      await Message.create([
        { from: patient._id, to: doctor._id, text: 'Message 1', roomId },
        { from: doctor._id, to: patient._id, text: 'Message 2', roomId },
        { from: patient._id, to: doctor._id, text: 'Message 3', roomId }
      ]);

      clientSocket.emit('join_room', { roomId });

      clientSocket.on('chat_cleared', () => {
        // Verified chat cleared
      });

      clientSocket.emit('clear_chat', { roomId });

      setTimeout(async () => {
        const messages = await Message.find({ roomId });
        expect(messages.length).toBe(0);
        done();
      }, 200);
    });
  });

  describe('Reply to Message', () => {
    it('should send message with reply reference', async (done) => {
      const patient = await createTestUser();
      const doctor = await createTestDoctor();
      const roomId = generateRoomId(patient._id, doctor._id);

      const originalMessage = await Message.create({
        from: doctor._id,
        to: patient._id,
        text: 'Original message',
        roomId
      });

      clientSocket.emit('join_room', { roomId });

      clientSocket.on('receive_message', (data) => {
        if (data.replyTo) {
          expect(data.replyTo).toBe(originalMessage._id.toString());
          expect(data.replyToText).toBe('Original message');
          expect(data.message).toBe('Reply to original');
          done();
        }
      });

      setTimeout(() => {
        clientSocket.emit('send_message', {
          from: patient._id.toString(),
          to: doctor._id.toString(),
          message: 'Reply to original',
          roomId,
          replyTo: originalMessage._id.toString(),
          replyToText: 'Original message'
        });
      }, 100);
    });
  });
});
