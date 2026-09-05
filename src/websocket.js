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



const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middleware/auth');

// Map of documentId -> Set of connected WebSocket clients
// Structure: { "doc-uuid-123": Set<WebSocket> }
const rooms = new Map();

function initWebSocketServer(server) {
  // Attach WebSocket server to the existing HTTP server instance
  const wss = new WebSocketServer({ noServer: true });

  // 1. Handle HTTP to WebSocket Upgrade Handshake with Auth
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    const documentId = url.searchParams.get('documentId');

    if (!token || !documentId) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Verify JWT before allowing protocol upgrade
    jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
      if (err) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }

      // Complete the WebSocket handshake
      wss.handleUpgrade(request, socket, head, (ws) => {
        ws.user = decodedUser; // Attach authenticated user data
        ws.documentId = documentId; // Attach requested room ID
        wss.emit('connection', ws, request);
      });
    });
  });

  // 2. Connection Lifecycle Management
  wss.on('connection', (ws) => {
    const { documentId, user } = ws;

    // Add socket to room
    if (!rooms.has(documentId)) {
      rooms.set(documentId, new Set());
    }
    rooms.get(documentId).add(ws);

    console.log(`User ${user.email} joined room: ${documentId}`);

    // Broadcast user joined event to other clients in room
    broadcastToRoom(documentId, ws, {
      type: 'USER_JOINED',
      userId: user.id,
      email: user.email,
    });

    // Handle Incoming Messages
    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message);
        
        // Broadcast incoming document updates to everyone in the room EXCEPT the sender
        broadcastToRoom(documentId, ws, {
          type: parsed.type || 'DOC_UPDATE',
          payload: parsed.payload,
          senderId: user.id,
        });
      } catch (err) {
        ws.send(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });

    // Handle Disconnection & Room Cleanup
    ws.on('close', () => {
      const room = rooms.get(documentId);
      if (room) {
        room.delete(ws);
        if (room.size === 0) {
          rooms.delete(documentId); // Garbage collect empty room
        } else {
          broadcastToRoom(documentId, null, {
            type: 'USER_LEFT',
            userId: user.id,
          });
        }
      }
      console.log(`User ${user.email} left room: ${documentId}`);
    });
  });

  return wss;
}

// Utility: Broadcast message to room members
function broadcastToRoom(documentId, senderWs, data) {
  const room = rooms.get(documentId);
  if (!room) return;

  const payload = JSON.stringify(data);
  for (const client of room) {
    // Send to active connections, skip the sender if specified
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

module.exports = { initWebSocketServer };