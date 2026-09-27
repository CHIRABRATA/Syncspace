const { Queue, Worker } = require('bullmq');
const Groq = require('groq-sdk');
const { pubClient } = require('./redis');

const aiQueue = new Queue('ai-agent-queue', {
  connection: process.env.REDIS_URL
    ? { url: process.env.REDIS_URL }
    : { host: process.env.REDIS_HOST || '127.0.0.1', port: process.env.REDIS_PORT || 6379 },
});

// Initialize Groq Client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const aiWorker = new Worker(
  'ai-agent-queue',
  async (job) => {
    const { documentId, prompt, currentContent, basePosition } = job.data;
    console.log(`[AI Worker (Groq)] Executing task for Doc: ${documentId}`);

    try {
      // 1. Initiate Streaming Completion from Groq
      const stream = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are SyncBot, an AI collaborative peer writing inside a real-time document.
Current Document Context:
"${currentContent}"

Provide only the text response to be inserted into the document. Be concise and direct.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'llama-3.3-70b-versatile', // Fast Llama 3.3 model on Groq
        stream: true,
      });

      let currentPos = basePosition + 0.1;
      let charIndex = 0;

      // 2. Process Incoming Token Chunks from Groq
      for await (const chunk of stream) {
        const textChunk = chunk.choices[0]?.delta?.content || '';

        // 3. Convert every streamed character into a CRDT INSERT operation
        for (const char of textChunk) {
          const op = {
            type: 'INSERT_OP',
            id: `syncbot_${Date.now()}_${charIndex++}`,
            char: char,
            position: currentPos,
            senderId: 'syncbot-agent-id',
          };

          // Publish directly to Redis Pub/Sub so all connected clients see live typing
          await pubClient.publish(`doc_room:${documentId}`, JSON.stringify(op));
          currentPos += 0.01;
        }
      }

      console.log(`[AI Worker (Groq)] Finished streaming edits for Doc: ${documentId}`);
    } catch (err) {
      console.error(`[AI Worker (Groq)] Task failed for Doc: ${documentId}`, err);
    }
  },
  {
    connection: process.env.REDIS_URL
      ? { url: process.env.REDIS_URL }
      : { host: process.env.REDIS_HOST || '127.0.0.1', port: process.env.REDIS_PORT || 6379 },
  }
);

/**
 * Helper to push an AI prompt job to BullMQ
 */
async function triggerAiAgent(documentId, prompt, currentContent, basePosition = 100.0) {
  await aiQueue.add('process-ai-prompt', {
    documentId,
    prompt,
    currentContent,
    basePosition,
  });
}

module.exports = { triggerAiAgent };