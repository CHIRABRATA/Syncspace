const db = require('./src/db');

async function migrate() {
  try {
    // Add updated_at column to document_permissions if missing
    await db.query(`
      ALTER TABLE document_permissions 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    `);
    console.log('✅ Added updated_at column to document_permissions');

    // Verify unique constraint exists on (document_id, user_id)
    const constraints = await db.query(`
      SELECT conname FROM pg_constraint 
      WHERE conrelid = 'document_permissions'::regclass 
      AND contype = 'u'
    `);
    console.log('Existing unique constraints:', constraints.rows);

    process.exit(0);
  } catch (e) {
    console.error('Migration error:', e.message);
    process.exit(1);
  }
}
migrate();
