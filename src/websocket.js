const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { scheduleDocumentSave } = require('./queue');
const { triggerAiAgent } = require('./aiWorker');
const { JWT_SECRET } = require('./middleware/auth');
const { DocumentCRDT } = require('./crdt');
const { pubClient, subClient } = require('./redis');

// Unique ID for this server instance to prevent duplicate broadcasts over Redis
const serverInstanceId = crypto.randomUUID();

// Local Map for rooms connected to THIS specific server instance
const localRooms = new Map();

function broadcastPresence(documentId) {
  const room = localRooms.get(documentId);
  if (!room) return;

  const uniqueUsers = [];
  const seen = new Set();
  for (const client of room.sockets) {
    if (client.user && !seen.has(client.user.id)) {
      seen.add(client.user.id);
      uniqueUsers.push({
        id: client.user.id,
        email: client.user.email,
        role: client.docRole || 'READ',
      });
    }
  }

  const presenceMsg = JSON.stringify({
    type: 'PRESENCE_UPDATE',
    collaborators: uniqueUsers,
  });

  for (const client of room.sockets) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(presenceMsg);
    }
  }
}

/**
 * Determine a user's role for a document from the database.
 * Returns 'OWNER' | 'WRITE' | 'READ' | null (no access)
 */
async function getUserDocumentRole(userId, documentId) {
  try {
    // Check if user is owner
    const docResult = await db.query(
      'SELECT owner_id FROM documents WHERE id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return null; // Document doesn't exist
    }

    if (docResult.rows[0].owner_id === userId) {
      return 'OWNER';
    }

    // Check explicit permission
    const permResult = await db.query(
      'SELECT role FROM document_permissions WHERE document_id = $1 AND user_id = $2',
      [documentId, userId]
    );

    if (permResult.rows.length === 0) {
      return null; // No access
    }

    return permResult.rows[0].role; // 'READ' or 'WRITE'
  } catch (err) {
    console.error('getUserDocumentRole error:', err.message);
    return null;
  }
}

function initWebSocketServer(server) {
  const wss = new WebSocketServer({ noServer: true });

  // Subscribe to Redis pattern for all document rooms
  subClient.psubscribe('doc_room:*', (err) => {
    if (err) console.error('Failed to subscribe to Redis channels:', err.message);
  });

  // Listen for messages from other server instances via Redis
  subClient.on('pmessage', (pattern, channel, message) => {
    try {
      const documentId = channel.replace('doc_room:', '');
      const room = localRooms.get(documentId);
      if (!room) return;

      const parsedEvent = JSON.parse(message);

      // Skip if this event was originated and already broadcasted locally by this instance
      if (parsedEvent.serverInstance === serverInstanceId) {
        return;
      }

      // Apply operation to local CRDT
      if (parsedEvent.type === 'INSERT_OP') {
        room.crdt.insert(parsedEvent.id, parsedEvent.char, parsedEvent.position);
      } else if (parsedEvent.type === 'DELETE_OP') {
        room.crdt.delete(parsedEvent.id);
      }

      // Broadcast message to local WebSocket connections on this instance
      for (const client of room.sockets) {
        if (client.readyState === WebSocket.OPEN && client.id !== parsedEvent.socketId) {
          client.send(message);
        }
      }

      // Persist AI-generated edits automatically
      if (parsedEvent.senderId === 'syncbot-agent-id') {
        scheduleDocumentSave(documentId, room.crdt.toString()).catch(() => {});
      }
    } catch (err) {
      console.error('Redis pmessage processing error:', err.message);
    }

  });

  server.on('upgrade', async (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    const documentId = url.searchParams.get('documentId');

    if (!token || !documentId) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    jwt.verify(token, JWT_SECRET, async (err, decodedUser) => {
      if (err) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }

      // ---- AUTHORIZATION CHECK ----
      // Determine the user's role from the database (not from frontend)
      const role = await getUserDocumentRole(decodedUser.id, documentId);

      if (!role) {
        // User has NO ACCESS to this document
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        ws.id = crypto.randomUUID();
        ws.user = decodedUser;
        ws.userId = decodedUser.id;
        ws.documentId = documentId;
        ws.docRole = role; // 'OWNER' | 'WRITE' | 'READ'
        wss.emit('connection', ws, request);
      });
    });
  });

  wss.on('connection', async (ws) => {
    const { documentId, user, docRole } = ws;

    // Synchronously create room structure to prevent race conditions on concurrent connects
    if (!localRooms.has(documentId)) {
      const crdt = new DocumentCRDT();
      const loadPromise = (async () => {
        try {
          const docResult = await db.query('SELECT content FROM documents WHERE id = $1', [documentId]);
          const initialContent = docResult.rows[0]?.content || '';
          const currentRoom = localRooms.get(documentId);
          if (currentRoom && currentRoom.crdt.nodes.length === 0) {
            for (let i = 0; i < initialContent.length; i++) {
              currentRoom.crdt.insert(`init_${i}`, initialContent[i], (i + 1) * 100);
            }
          }
        } catch (err) {
          console.error('Failed to load initial document content from DB:', err.message);
        }
      })();

      localRooms.set(documentId, {
        sockets: new Set(),
        crdt,
        loadPromise,
      });
    }

    const room = localRooms.get(documentId);
    room.sockets.add(ws);

    // Register message handler synchronously so no early messages are dropped
    ws.on('message', async (rawMessage) => {
      try {
        if (room.loadPromise) {
          await room.loadPromise;
        }

        const messageString = rawMessage.toString('utf8');
        const op = JSON.parse(messageString);

        op.senderId = user.id;
        op.socketId = ws.id;

        if (op.type === 'INSERT_OP') {
          // ---- WRITE PROTECTION: Only OWNER or WRITE can insert ----
          if (ws.docRole === 'READ') {
            ws.send(JSON.stringify({ type: 'ERROR', error: 'Read-only access. You cannot edit this document.' }));
            return;
          }

          room.crdt.insert(op.id, op.char, op.position);

          // Fast local broadcast to other connected tabs/clients
          const payload = JSON.stringify(op);
          for (const client of room.sockets) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(payload);
            }
          }

          // Publish to Redis for other server instances
          try {
            op.serverInstance = serverInstanceId;
            pubClient.publish(`doc_room:${documentId}`, JSON.stringify(op));
          } catch (e) {}

          // Schedule debounced database persistence
          scheduleDocumentSave(documentId, room.crdt.toString()).catch(() => {});
        } else if (op.type === 'DELETE_OP') {
          // ---- WRITE PROTECTION: Only OWNER or WRITE can delete ----
          if (ws.docRole === 'READ') {
            ws.send(JSON.stringify({ type: 'ERROR', error: 'Read-only access. You cannot edit this document.' }));
            return;
          }

          room.crdt.delete(op.id);

          // Fast local broadcast to other connected tabs/clients
          const payload = JSON.stringify(op);
          for (const client of room.sockets) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(payload);
            }
          }

          // Publish to Redis for other server instances
          try {
            op.serverInstance = serverInstanceId;
            pubClient.publish(`doc_room:${documentId}`, JSON.stringify(op));
          } catch (e) {}

          // Schedule debounced database persistence
          scheduleDocumentSave(documentId, room.crdt.toString()).catch(() => {});
        } else if (op.type === 'AI_PROMPT') {
          // ---- WRITE PROTECTION: Only OWNER or WRITE can trigger AI ----
          if (ws.docRole === 'READ') {
            ws.send(JSON.stringify({ type: 'ERROR', error: 'Read-only access. You cannot use AI Writer.' }));
            return;
          }

          console.log(`[AI Triggered] Prompt: "${op.prompt}" in Room: ${documentId}`);
          let insertPos = op.insertAtPosition;
          if (insertPos == null && room.crdt.nodes.length > 0) {
            const activeNodes = room.crdt.nodes.filter((n) => !n.deleted);
            insertPos = activeNodes.length > 0 ? activeNodes[activeNodes.length - 1].position + 10 : 100;
          }
          triggerAiAgent(
            documentId,
            op.prompt,
            room.crdt.toString(),
            insertPos || 100.0
          );
        } else {

          ws.send(JSON.stringify({ error: 'Unknown operation type' }));
        }
      } catch (err) {
        console.error('WebSocket Message Parse Error:', err.message);
        ws.send(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });

    ws.on('close', () => {
      if (room) {
        room.sockets.delete(ws);
        broadcastPresence(documentId);
        if (room.sockets.size === 0) {
          localRooms.delete(documentId);
        }
      }
      try {
        pubClient.hdel(`presence:${documentId}`, user.id);
      } catch (e) {}
    });

    // Await document content hydration before sending INIT_STATE and tracking presence
    if (room.loadPromise) {
      await room.loadPromise;
    }

    // Send complete initial CRDT state including nodes, text content, and the user's role
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'INIT_STATE',
          content: room.crdt.toString(),
          nodes: room.crdt.nodes.filter((n) => !n.deleted),
          role: ws.docRole, // Send the user's role to the frontend
        })
      );
    }

    // Broadcast updated presence to all room participants
    broadcastPresence(documentId);

    // Track active user presence in Redis
    try {
      pubClient.hset(`presence:${documentId}`, user.id, JSON.stringify({ email: user.email, role: ws.docRole, onlineAt: Date.now() }));
      pubClient.expire(`presence:${documentId}`, 120);
    } catch (e) {}
  });

  return wss;
}

module.exports = { initWebSocketServer };