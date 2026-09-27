// AUTHORIZATION FLOW:

// 1. Get documentId
// 2. Get logged-in userId
// 3. Find document
// 4. Document exists?
//       NO → 404
//       YES ↓
// 5. Is user OWNER?
//       YES → OWNER → next()
//       NO ↓
// 6. Check document_permissions
// 7. Permission exists?
//       NO → 403
//       YES ↓
// 8. Get role (READ / WRITE)
// 9. Is WRITE required?
//       YES + user is READ → 403
//       Otherwise → next()
// 10. DB error → 500


const db = require('../db');

/**
 * Authorization middleware to check if user has required access level.
 * @param {('READ'|'WRITE')} requiredRole 
 */
function authorizeDocumentAccess(requiredRole = 'READ') {
  return async (req, res, next) => {
    const documentId = req.params.id;
    const userId = req.user.id;

    try {
      // 1. Check if user is document owner and also if the document exists or not 
      const docResult = await db.query(
        'SELECT owner_id FROM documents WHERE id = $1',
        [documentId]
      );
      //check if document exists
      if (docResult.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }
     //check if user is the owner of the document
      if (docResult.rows[0].owner_id === userId) {
        req.docRole = 'OWNER';
        return next();
      }

      // 2. Check explicit permission in document_permissions table
      const permResult = await db.query(
        'SELECT role FROM document_permissions WHERE document_id = $1 AND user_id = $2',
        [documentId, userId]
      );
     //check if user has permission to access the document
      if (permResult.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this document' });
      }

      const userRole = permResult.rows[0].role;

      // 3. Verify role sufficiency
      if (requiredRole === 'WRITE' && userRole !== 'WRITE') {
        return res.status(403).json({ error: 'Write permission required' });
      }

      req.docRole = userRole;
      next();
    } catch (err) {
      console.error('Authorization middleware error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Owner-only middleware. Rejects any user who is not the document owner.
 * Use this to protect DELETE, sharing, and permission management routes.
 */
function requireDocumentOwner() {
  return async (req, res, next) => {
    const documentId = req.params.id;
    const userId = req.user.id;

    try {
      const docResult = await db.query(
        'SELECT owner_id FROM documents WHERE id = $1',
        [documentId]
      );

      if (docResult.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }

      if (docResult.rows[0].owner_id !== userId) {
        return res.status(403).json({ error: 'Only the document owner can perform this action' });
      }

      req.docRole = 'OWNER';
      next();
    } catch (err) {
      console.error('Owner authorization error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

module.exports = { authorizeDocumentAccess, requireDocumentOwner };