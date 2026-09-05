const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { authorizeDocumentAccess } = require('../middleware/authorize');

const router = express.Router();

// Apply Auth Middleware to all document routes
router.use(authenticateToken);

// GET /api/documents - Get all documents owned by or shared with the authenticated user
router.get('/', async (req, res) => {
  const userId = req.user.id;

  try {
    const queryText = `
      SELECT DISTINCT d.id, d.title, d.content, d.owner_id, d.created_at, d.updated_at
      FROM documents d
      LEFT JOIN document_permissions dp ON d.id = dp.document_id
      WHERE d.owner_id = $1 OR dp.user_id = $1
      ORDER BY d.updated_at DESC
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
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating document:', err);
    return res.status(500).json({ error: 'Failed to create document' });
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

// DELETE /api/documents/:id - Delete document (Only Owner can delete)
router.delete('/:id', async (req, res) => {
  const documentId = req.params.id;
  const userId = req.user.id;

  try {
    const result = await db.query(
      'DELETE FROM documents WHERE id = $1 AND owner_id = $2 RETURNING id',
      [documentId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found or unauthorized' });
    }

    return res.status(204).send();
  } catch (err) {
    console.error('Error deleting document:', err);
    return res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;