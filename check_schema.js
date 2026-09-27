const db = require('./src/db');

async function checkSchema() {
  try {
    const r = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'document_permissions' ORDER BY ordinal_position");
    console.log('document_permissions columns:', JSON.stringify(r.rows, null, 2));

    const r2 = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'documents' ORDER BY ordinal_position");
    console.log('documents columns:', JSON.stringify(r2.rows, null, 2));
    
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
checkSchema();
