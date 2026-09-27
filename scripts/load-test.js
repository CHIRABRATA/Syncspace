const WebSocket = require('ws');

// --- LOAD TEST CONFIGURATION ---
const CONCURRENT_CLIENTS = 100; // Total simulated users
const OPERATIONS_PER_CLIENT = 10; // Keystrokes per user
const INTER_OP_DELAY_MS = 200; // Delay between keystrokes
const TARGET_URL = 'ws://localhost:3000';

// Replace with a valid JWT token & Document ID from your environment
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNhMmMyMGU3LTE3MzYtNDQ0Ni1iNDFmLTgyZjVhZTE0NDNhYyIsImVtYWlsIjoidXNlcjFAZXhhbXBsZS5jb20iLCJpYXQiOjE3OTA1MDUwODYsImV4cCI6MTc5MDU5MTQ4Nn0.cr7Aaa9dYexP4hPneHwZF_7QXOltM1b_dPPGbh-GwMQ';
const TEST_DOC_ID = '9660501b-86ed-42cf-b606-529b549d3933';

const wsUrl = `${TARGET_URL}?token=${TEST_TOKEN}&documentId=${TEST_DOC_ID}`;

let connectedCount = 0;
let errorsCount = 0;
let opsSent = 0;
const latencies = [];

console.log(`Starting WebSocket Load Test: ${CONCURRENT_CLIENTS} concurrent clients...`);
const startTime = Date.now();

for (let i = 0; i < CONCURRENT_CLIENTS; i++) {
  const clientId = `client_${i}`;
  const ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    connectedCount++;
    simulateUserTyping(ws, clientId);
  });

  ws.on('error', (err) => {
    errorsCount++;
    if (errorsCount <= 3) {
      console.error(`Client connection error: ${err.message}`);
    }
  });

  ws.on('close', () => {
    connectedCount--;
  });
}

function simulateUserTyping(ws, clientId) {
  let count = 0;

  const interval = setInterval(() => {
    if (count >= OPERATIONS_PER_CLIENT || ws.readyState !== WebSocket.OPEN) {
      clearInterval(interval);
      ws.close();
      return;
    }

    const opStart = Date.now();
    const op = {
      type: 'INSERT_OP',
      id: `${clientId}_p${count}`,
      char: String.fromCharCode(65 + (count % 26)), // A, B, C...
      position: count + 1.0,
    };

    ws.send(JSON.stringify(op));
    opsSent++;
    latencies.push(Date.now() - opStart);
    count++;
  }, INTER_OP_DELAY_MS);
}

// Print Metrics Report after test completion
setTimeout(() => {
  const totalTimeSec = (Date.now() - startTime) / 1000;
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);

  console.log('\n=======================================');
  console.log('       SYNCSPACE LOAD TEST REPORT       ');
  console.log('=======================================');
  console.log(`Peak Concurrent Connections : ${CONCURRENT_CLIENTS}`);
  console.log(`Total Operations Sent       : ${opsSent}`);
  console.log(`Connection Errors          : ${errorsCount}`);
  console.log(`Test Duration              : ${totalTimeSec.toFixed(2)}s`);
  console.log(`Throughput                 : ${(opsSent / totalTimeSec).toFixed(2)} ops/sec`);
  console.log(`Avg Send Overhead          : ${avgLatency.toFixed(2)} ms`);
  console.log('=======================================\n');
  process.exit(0);
}, (OPERATIONS_PER_CLIENT * INTER_OP_DELAY_MS) + 3000);