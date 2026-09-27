const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { authorizeDocumentAccess, requireDocumentOwner } = require('../middleware/authorize');

const router = express.Router();

// Apply Auth Middleware to all document routes
router.use(authenticateToken);

// GET /api/documents - Get all documents owned by or shared with the authenticated user
// Returns the role for each document (OWNER, WRITE, READ)
router.get('/', async (req, res) => {
  const userId = req.user.id;

  try {
    const queryText = `
      SELECT DISTINCT ON (d.id)
        d.id, d.title, d.content, d.owner_id, d.created_at, d.updated_at,
        CASE
          WHEN d.owner_id = $1 THEN 'OWNER'
          ELSE COALESCE(dp.role, 'READ')
        END AS role
      FROM documents d
      LEFT JOIN document_permissions dp ON d.id = dp.document_id AND dp.user_id = $1
      WHERE d.owner_id = $1 OR dp.user_id = $1
      ORDER BY d.id, d.updated_at DESC
    `;
    const result = await db.query(queryText, [userId]);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching documents:', err);
    return res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST /api/documents - Create a new document in PostgreSQL
router.post('/', async (req, res) => {
  const ownerId = req.user.id;
  const title = typeof req.body.title === 'string' && req.body.title.trim() ? req.body.title.trim() : 'Untitled Document';
  const content = typeof req.body.content === 'string' ? req.body.content : '';

  try {
    const queryText = `
      INSERT INTO documents (title, content, owner_id)
      VALUES ($1, $2, $3)
      RETURNING id, title, content, owner_id, created_at, updated_at
    `;
    const result = await db.query(queryText, [title, content, ownerId]);
    return res.status(201).json({ ...result.rows[0], role: 'OWNER' });
  } catch (err) {
    console.error('Error creating document:', err);
    return res.status(500).json({ error: 'Failed to create document' });
  }
});

// POST /api/documents/join - Join an existing document by ID
// Does NOT auto-grant WRITE anymore; only adds READ if user has no existing permission
router.post('/join', async (req, res) => {
  const { documentId } = req.body;
  const userId = req.user.id;

  if (!documentId) {
    return res.status(400).json({ error: 'Document ID is required' });
  }

  try {
    const docResult = await db.query('SELECT * FROM documents WHERE id = $1', [documentId]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = docResult.rows[0];
    let role = 'OWNER';

    // If caller is not owner, give them READ permission so it shows in their documents
    if (doc.owner_id !== userId) {
      await db.query(
        `INSERT INTO document_permissions (document_id, user_id, role)
         VALUES ($1, $2, 'READ')
         ON CONFLICT (document_id, user_id) DO NOTHING`,
        [documentId, userId]
      );
      // Fetch actual role (may already have WRITE from owner sharing)
      const permResult = await db.query(
        'SELECT role FROM document_permissions WHERE document_id = $1 AND user_id = $2',
        [documentId, userId]
      );
      role = permResult.rows[0]?.role || 'READ';
    }

    return res.json({ ...doc, role });
  } catch (err) {
    console.error('Error joining document:', err);
    return res.status(500).json({ error: 'Failed to join document' });
  }
});

// GET /api/documents/:id - Get document by ID (with READ permission check)
router.get('/:id', authorizeDocumentAccess('READ'), async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    return res.json({ ...result.rows[0], role: req.docRole });
  } catch (err) {
    console.error('Error fetching document:', err);
    return res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// PATCH /api/documents/:id - Update document (with WRITE permission check)
router.patch('/:id', authorizeDocumentAccess('WRITE'), async (req, res) => {
  const { title, content } = req.body;
  const documentId = req.params.id;

  try {
    // Build dynamic SQL query depending on provided fields
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'title must be a non-empty string' });
      }
      updates.push(`title = $${paramIndex++}`);
      values.push(title.trim());
    }

    if (content !== undefined) {
      if (typeof content !== 'string') {
        return res.status(400).json({ error: 'content must be a string' });
      }
      updates.push(`content = $${paramIndex++}`);
      values.push(content);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(documentId);

    const queryText = `
      UPDATE documents
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(queryText, values);
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating document:', err);
    return res.status(500).json({ error: 'Failed to update document' });
  }
});

// =====================================================================
// PERMISSION MANAGEMENT ENDPOINTS (OWNER-ONLY)
// =====================================================================

// POST /api/documents/:id/permissions - Add permission for a user (by email)
router.post('/:id/permissions', requireDocumentOwner(), async (req, res) => {
  const { email, role = 'READ' } = req.body;
  const documentId = req.params.id;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!['READ', 'WRITE'].includes(role)) {
    return res.status(400).json({ error: 'Role must be READ or WRITE' });
  }

  try {
    const userRes = await db.query('SELECT id, email FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'No user registered with that email' });
    }

    const targetUser = userRes.rows[0];

    // Prevent owner from adding themselves as a permission
    if (targetUser.id === req.user.id) {
      return res.status(400).json({ error: 'You are already the owner of this document' });
    }

    await db.query(
      `INSERT INTO document_permissions (document_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (document_id, user_id) DO UPDATE SET role = EXCLUDED.role, updated_at = CURRENT_TIMESTAMP`,
      [documentId, targetUser.id, role]
    );

    return res.json({ message: `Successfully shared with ${email}`, user: targetUser, role });
  } catch (err) {
    console.error('Error adding permission:', err);
    return res.status(500).json({ error: 'Failed to add permission' });
  }
});

// GET /api/documents/:id/permissions - List all permissions for a document (OWNER-ONLY)
router.get('/:id/permissions', requireDocumentOwner(), async (req, res) => {
  const documentId = req.params.id;

  try {
    const result = await db.query(
      `SELECT dp.user_id, dp.role, dp.created_at, dp.updated_at, u.email
       FROM document_permissions dp
       JOIN users u ON u.id = dp.user_id
       WHERE dp.document_id = $1
       ORDER BY dp.created_at ASC`,
      [documentId]
    );

    // Also include the owner
    const ownerResult = await db.query(
      'SELECT d.owner_id, u.email FROM documents d JOIN users u ON u.id = d.owner_id WHERE d.id = $1',
      [documentId]
    );

    const owner = ownerResult.rows[0] ? { user_id: ownerResult.rows[0].owner_id, email: ownerResult.rows[0].email, role: 'OWNER' } : null;

    return res.json({ owner, permissions: result.rows });
  } catch (err) {
    console.error('Error listing permissions:', err);
    return res.status(500).json({ error: 'Failed to list permissions' });
  }
});

// PUT /api/documents/:id/permissions/:userId - Update a user's permission (OWNER-ONLY)
router.put('/:id/permissions/:userId', requireDocumentOwner(), async (req, res) => {
  const { role } = req.body;
  const documentId = req.params.id;
  const targetUserId = req.params.userId;

  if (!['READ', 'WRITE'].includes(role)) {
    return res.status(400).json({ error: 'Role must be READ or WRITE' });
  }

  // Prevent owner from modifying their own role
  if (targetUserId === req.user.id) {
    return res.status(400).json({ error: 'Cannot modify owner permissions' });
  }

  try {
    const result = await db.query(
      `UPDATE document_permissions SET role = $1, updated_at = CURRENT_TIMESTAMP
       WHERE document_id = $2 AND user_id = $3
       RETURNING *`,
      [role, documentId, targetUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Permission not found for this user' });
    }

    return res.json({ message: 'Permission updated', role });
  } catch (err) {
    console.error('Error updating permission:', err);
    return res.status(500).json({ error: 'Failed to update permission' });
  }
});

// DELETE /api/documents/:id/permissions/:userId - Revoke a user's access (OWNER-ONLY)
router.delete('/:id/permissions/:userId', requireDocumentOwner(), async (req, res) => {
  const documentId = req.params.id;
  const targetUserId = req.params.userId;

  // Prevent owner from removing themselves
  if (targetUserId === req.user.id) {
    return res.status(400).json({ error: 'Cannot revoke owner access' });
  }

  try {
    const result = await db.query(
      'DELETE FROM document_permissions WHERE document_id = $1 AND user_id = $2 RETURNING *',
      [documentId, targetUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    return res.json({ message: 'Access revoked' });
  } catch (err) {
    console.error('Error revoking permission:', err);
    return res.status(500).json({ error: 'Failed to revoke permission' });
  }
});

// =====================================================================
// LEGACY SHARE ENDPOINT (now redirects to permissions)
// =====================================================================

// POST /api/documents/:id/share - Share document with another user by email (OWNER-ONLY)
router.post('/:id/share', requireDocumentOwner(), async (req, res) => {
  const { email, role = 'READ' } = req.body;
  const documentId = req.params.id;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!['READ', 'WRITE'].includes(role)) {
    return res.status(400).json({ error: 'Role must be READ or WRITE' });
  }

  try {
    const userRes = await db.query('SELECT id, email FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'No user registered with that email' });
    }

    const targetUser = userRes.rows[0];

    if (targetUser.id === req.user.id) {
      return res.status(400).json({ error: 'You are already the owner of this document' });
    }

    await db.query(
      `INSERT INTO document_permissions (document_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (document_id, user_id) DO UPDATE SET role = EXCLUDED.role, updated_at = CURRENT_TIMESTAMP`,
      [documentId, targetUser.id, role]
    );

    return res.json({ message: `Successfully shared with ${email}`, user: targetUser, role });
  } catch (err) {
    console.error('Error sharing document:', err);
    return res.status(500).json({ error: 'Failed to share document' });
  }
});

// =====================================================================
// DOCUMENT ACTIONS
// =====================================================================

// POST /api/documents/:id/duplicate - Duplicate a document (any access level)
router.post('/:id/duplicate', authorizeDocumentAccess('READ'), async (req, res) => {
  const documentId = req.params.id;
  const userId = req.user.id;

  try {
    const docResult = await db.query('SELECT title, content FROM documents WHERE id = $1', [documentId]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const original = docResult.rows[0];
    const newTitle = `${original.title} (Copy)`;

    const result = await db.query(
      `INSERT INTO documents (title, content, owner_id)
       VALUES ($1, $2, $3)
       RETURNING id, title, content, owner_id, created_at, updated_at`,
      [newTitle, original.content, userId]
    );

    return res.status(201).json({ ...result.rows[0], role: 'OWNER' });
  } catch (err) {
    console.error('Error duplicating document:', err);
    return res.status(500).json({ error: 'Failed to duplicate document' });
  }
});

// POST /api/documents/:id/leave - Leave a shared document (non-owner only)
router.post('/:id/leave', authenticateToken, async (req, res) => {
  const documentId = req.params.id;
  const userId = req.user.id;

  try {
    // Check if user is owner
    const docResult = await db.query('SELECT owner_id FROM documents WHERE id = $1', [documentId]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (docResult.rows[0].owner_id === userId) {
      return res.status(400).json({ error: 'Owner cannot leave their own document. Transfer ownership or delete it.' });
    }

    await db.query(
      'DELETE FROM document_permissions WHERE document_id = $1 AND user_id = $2',
      [documentId, userId]
    );

    return res.json({ message: 'Left document successfully' });
  } catch (err) {
    console.error('Error leaving document:', err);
    return res.status(500).json({ error: 'Failed to leave document' });
  }
});

// DELETE /api/documents/:id - Delete document (Only Owner can delete)
router.delete('/:id', requireDocumentOwner(), async (req, res) => {
  const documentId = req.params.id;

  try {
    // Delete permissions first (foreign key)
    await db.query('DELETE FROM document_permissions WHERE document_id = $1', [documentId]);

    const result = await db.query(
      'DELETE FROM documents WHERE id = $1 RETURNING id',
      [documentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.status(204).send();
  } catch (err) {
    console.error('Error deleting document:', err);
    return res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;