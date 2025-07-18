const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map of userId -> Set of WebSocket connections
    this.rooms = new Map(); // Map of roomId -> Set of userIds
    this.userSessions = new Map(); // Map of userId -> user data
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    
    console.log('WebSocket server initialized');
  }

  async verifyClient(info) {
    try {
      const url = new URL(info.req.url, `http://${info.req.headers.host}`);
      const token = url.searchParams.get('token');
      
      if (!token) {
        return false;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user || user.status !== 'active') {
        return false;
      }

      // Store user info for use in connection handler
      info.req.user = user;
      return true;
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      return false;
    }
  }

  handleConnection(ws, req) {
    const user = req.user;
    const userId = user.userId;
    const connectionId = uuidv4();

    // Store connection
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(ws);

    // Store user session info
    this.userSessions.set(userId, {
      userId,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId,
      lastActive: new Date()
    });

    // Set up connection metadata
    ws.userId = userId;
    ws.connectionId = connectionId;
    ws.isAlive = true;

    console.log(`WebSocket connected: ${userId} (${connectionId})`);

    // Send welcome message
    this.sendToUser(userId, {
      type: 'connected',
      data: {
        connectionId,
        timestamp: new Date().toISOString()
      }
    });

    // Handle incoming messages
    ws.on('message', (message) => {
      this.handleMessage(ws, message);
    });

    // Handle connection close
    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    // Handle connection errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for user ${userId}:`, error);
      this.handleDisconnection(ws);
    });

    // Set up heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Notify others about user online status
    this.broadcastUserStatus(userId, 'online');
  }

  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      const { type, payload } = data;

      switch (type) {
        case 'ping':
          this.sendToConnection(ws, { type: 'pong' });
          break;
        
        case 'join_room':
          this.joinRoom(ws.userId, payload.roomId);
          break;
        
        case 'leave_room':
          this.leaveRoom(ws.userId, payload.roomId);
          break;
        
        case 'document_update':
          this.handleDocumentUpdate(ws.userId, payload);
          break;
        
        case 'cursor_position':
          this.handleCursorPosition(ws.userId, payload);
          break;
        
        case 'user_typing':
          this.handleUserTyping(ws.userId, payload);
          break;
        
        default:
          console.warn(`Unknown message type: ${type}`);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  handleDisconnection(ws) {
    const userId = ws.userId;
    
    if (userId) {
      // Remove connection
      const userConnections = this.clients.get(userId);
      if (userConnections) {
        userConnections.delete(ws);
        if (userConnections.size === 0) {
          this.clients.delete(userId);
          this.userSessions.delete(userId);
          // Notify others about user offline status
          this.broadcastUserStatus(userId, 'offline');
        }
      }

      // Remove from all rooms
      this.rooms.forEach((users, roomId) => {
        if (users.has(userId) && !this.clients.has(userId)) {
          users.delete(userId);
          this.broadcastToRoom(roomId, {
            type: 'user_left',
            data: { userId, roomId }
          }, userId);
        }
      });

      console.log(`WebSocket disconnected: ${userId} (${ws.connectionId})`);
    }
  }

  // Room management
  joinRoom(userId, roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    
    this.rooms.get(roomId).add(userId);
    
    // Notify others in the room
    this.broadcastToRoom(roomId, {
      type: 'user_joined',
      data: { userId, roomId }
    }, userId);

    // Send room info to user
    this.sendToUser(userId, {
      type: 'room_joined',
      data: {
        roomId,
        users: Array.from(this.rooms.get(roomId))
      }
    });
  }

  leaveRoom(userId, roomId) {
    const room = this.rooms.get(roomId);
    if (room && room.has(userId)) {
      room.delete(userId);
      
      // Notify others in the room
      this.broadcastToRoom(roomId, {
        type: 'user_left',
        data: { userId, roomId }
      }, userId);

      // Clean up empty rooms
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  // Document collaboration
  handleDocumentUpdate(userId, payload) {
    const { documentId, operation, content } = payload;
    
    // Broadcast to all users in the document room
    this.broadcastToRoom(`document:${documentId}`, {
      type: 'document_update',
      data: {
        userId,
        documentId,
        operation,
        content,
        timestamp: new Date().toISOString()
      }
    }, userId);
  }

  handleCursorPosition(userId, payload) {
    const { documentId, position } = payload;
    
    this.broadcastToRoom(`document:${documentId}`, {
      type: 'cursor_position',
      data: {
        userId,
        documentId,
        position,
        timestamp: new Date().toISOString()
      }
    }, userId);
  }

  handleUserTyping(userId, payload) {
    const { documentId, isTyping } = payload;
    
    this.broadcastToRoom(`document:${documentId}`, {
      type: 'user_typing',
      data: {
        userId,
        documentId,
        isTyping,
        timestamp: new Date().toISOString()
      }
    }, userId);
  }

  // Broadcast methods
  sendToConnection(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  sendToUser(userId, message) {
    const connections = this.clients.get(userId);
    if (connections) {
      connections.forEach(ws => {
        this.sendToConnection(ws, message);
      });
    }
  }

  broadcastToRoom(roomId, message, excludeUserId = null) {
    const users = this.rooms.get(roomId);
    if (users) {
      users.forEach(userId => {
        if (userId !== excludeUserId) {
          this.sendToUser(userId, message);
        }
      });
    }
  }

  broadcastToAll(message, excludeUserId = null) {
    this.clients.forEach((connections, userId) => {
      if (userId !== excludeUserId) {
        this.sendToUser(userId, message);
      }
    });
  }

  broadcastUserStatus(userId, status) {
    const userSession = this.userSessions.get(userId);
    if (userSession) {
      this.broadcastToAll({
        type: 'user_status',
        data: {
          userId,
          status,
          user: userSession,
          timestamp: new Date().toISOString()
        }
      }, userId);
    }
  }

  // Notification methods
  sendNotification(userId, notification) {
    this.sendToUser(userId, {
      type: 'notification',
      data: notification
    });
  }

  broadcastNotification(notification, targetUsers = null) {
    const message = {
      type: 'notification',
      data: notification
    };

    if (targetUsers) {
      targetUsers.forEach(userId => {
        this.sendToUser(userId, message);
      });
    } else {
      this.broadcastToAll(message);
    }
  }

  // Activity updates
  broadcastActivity(activity) {
    this.broadcastToAll({
      type: 'activity_update',
      data: activity
    });
  }

  // Document events
  broadcastDocumentEvent(eventType, documentData, targetUsers = null) {
    const message = {
      type: 'document_event',
      data: {
        eventType,
        document: documentData,
        timestamp: new Date().toISOString()
      }
    };

    if (targetUsers) {
      targetUsers.forEach(userId => {
        this.sendToUser(userId, message);
      });
    } else {
      this.broadcastToAll(message);
    }
  }

  // SPV events
  broadcastSPVEvent(eventType, spvData, targetUsers = null) {
    const message = {
      type: 'spv_event',
      data: {
        eventType,
        spv: spvData,
        timestamp: new Date().toISOString()
      }
    };

    if (targetUsers) {
      targetUsers.forEach(userId => {
        this.sendToUser(userId, message);
      });
    } else {
      this.broadcastToAll(message);
    }
  }

  // Health check and cleanup
  startHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (ws.isAlive === false) {
          ws.terminate();
          return;
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  // Get active users
  getActiveUsers() {
    return Array.from(this.userSessions.values());
  }

  // Get room users
  getRoomUsers(roomId) {
    const users = this.rooms.get(roomId);
    if (!users) return [];
    
    return Array.from(users).map(userId => this.userSessions.get(userId)).filter(Boolean);
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.clients.has(userId);
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

module.exports = websocketService;