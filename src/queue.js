require('dotenv').config();
const { Queue, Worker } = require('bullmq');
const db = require('./db');


// Redis connection options for BullMQ
const connection = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379,
    };

// 1. Initialize BullMQ Queue
const documentSaveQueue = new Queue('document-save-queue', { connection });

// 2. Initialize Background Worker to process async save jobs
const saveWorker = new Worker(
  'document-save-queue',
  async (job) => {
    const { documentId, content } = job.data;
    console.log(`[Queue Worker] Persisting snapshot for Document: ${documentId}...`);

    try {
      await db.query(
        'UPDATE documents SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [content, documentId]
      );
      console.log(`[Queue Worker] Successfully saved Document: ${documentId}`);
    } catch (err) {
      console.error(`[Queue Worker] Failed to save Document: ${documentId}`, err);
      throw err; // Re-throws to trigger BullMQ retry logic
    }
  },
  { connection }
);

saveWorker.on('failed', (job, err) => {
  console.error(`[Queue Worker] Job ${job?.id} failed after retries:`, err.message);
});

/**
 * Schedule a debounced save job.
 * Prevents queue flooding by replacing pending jobs for the same document.
 */
async function scheduleDocumentSave(documentId, content) {
  const safeDocId = String(documentId).replace(/:/g, '_');
  await documentSaveQueue.add(
    'save-snapshot',
    { documentId, content },
    {
      jobId: `save-${safeDocId}`, // Deduplicates/overwrites pending job for this doc
      delay: 5000, // Debounce delay: Wait 5 seconds of inactivity before writing to DB
      removeOnComplete: true,
      attempts: 3, // Retry up to 3 times on DB failure
    }
  );
}

module.exports = { scheduleDocumentSave };