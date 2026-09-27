// // WEBSOCKET SERVER FLOW:

// 1. Client requests WebSocket upgrade
// 2. Get JWT + documentId
// 3. Verify JWT
// 4. Reject invalid user
// 5. Complete WebSocket handshake
// 6. Attach user + documentId to socket
// 7. Add socket to document room
// 8. USER_JOINED → notify others
// 9. Receive message
// 10. Parse JSON
// 11. Broadcast update to other room members
// 12. close → remove socket
// 13. Empty room → delete room

// rooms:
// documentId → Set<WebSocket>

// broadcastToRoom():
// Find room → loop clients → skip sender → send to OPEN clients

// IMPORTANT:
// This handles REAL-TIME CONNECTION + BROADCASTING.
// It does NOT yet solve CONCURRENT EDITING / CRDT / OT.

const { scheduleDocumentSave } = require('./queue');
const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middleware/auth');
const { DocumentCRDT } = require('./crdt');
const { pubClient, subClient } = require('./redis');

// Local Map for sockets connected to THIS specific server instance
const localRooms = new Map();

function initWebSocketServer(server) {
  const wss = new WebSocketServer({ noServer: true });

  // Subscribe to Redis pattern for all document rooms
  subClient.psubscribe('doc_room:*', (err, count) => {
    if (err) console.error('Failed to subscribe to Redis channels:', err);
  });

  // Listen for messages from other server instances via Redis
  subClient.on('pmessage', (pattern, channel, message) => {
    const documentId = channel.replace('doc_room:', '');
    const room = localRooms.get(documentId);

    if (!room) return;

    const parsedEvent = JSON.parse(message);

    // Apply operation to local CRDT if received from another instance
    if (parsedEvent.type === 'INSERT_OP') {
      room.crdt.insert(parsedEvent.id, parsedEvent.char, parsedEvent.position);
    } else if (parsedEvent.type === 'DELETE_OP') {
      room.crdt.delete(parsedEvent.id);
    }

    // Broadcast message to local WebSocket connections on this instance
    for (const client of room.sockets) {
      if (client.readyState === WebSocket.OPEN && client.userId !== parsedEvent.senderId) {
        client.send(message);
      }
    }
  });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    const documentId = url.searchParams.get('documentId');

    if (!token || !documentId) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
      if (err) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        ws.user = decodedUser;
        ws.userId = decodedUser.id;
        ws.documentId = documentId;
        wss.emit('connection', ws, request);
      });
    });
  });

  wss.on('connection', (ws) => {
    const { documentId, user } = ws;

    if (!localRooms.has(documentId)) {
      localRooms.set(documentId, {
        sockets: new Set(),
        crdt: new DocumentCRDT(),
      });
    }

    const room = localRooms.get(documentId);
    room.sockets.add(ws);

    // Send initial CRDT state
    ws.send(
      JSON.stringify({
        type: 'INIT_STATE',
        content: room.crdt.toString(),
      })
    );

    // Track active user presence in Redis with 60-second expiration
    pubClient.hset(`presence:${documentId}`, user.id, JSON.stringify({ email: user.email, onlineAt: Date.now() }));
    pubClient.expire(`presence:${documentId}`, 60);

    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const op = JSON.parse(message);
        op.senderId = user.id;

        if (op.type === 'INSERT_OP' || op.type == 'DELETE_OP') {
          if(os.type ==='INSERT_OP'){
            room.crdt.insert(op.id, op.char, op.position);
          }else if(os.type ==='DELETE_OP'){
            room.crdt.delete(op.id);
          }
        } 

        // PUBLISH TO REDIS: All instances (including this one via sub) receive this
        pubClient.publish(`doc_room:${documentId}`, JSON.stringify(op));
      } catch (err) {
        ws.send(JSON.stringify({ error: 'Invalid payload' }));
      }
      scheduleDocumentSave(documentId, room.crdt.toString());
    });

    ws.on('close', () => {
      if (room) {
        room.sockets.delete(ws);
        if (room.sockets.size === 0) {
          localRooms.delete(documentId);
        }
      }
      // Remove presence on disconnect
      pubClient.hdel(`presence:${documentId}`, user.id);
    });
  });

  return wss;
}

module.exports = { initWebSocketServer };