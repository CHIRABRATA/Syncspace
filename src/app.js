require('dotenv').config();
const express = require('express');
const http = require('http');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const { initWebSocketServer } = require('./websocket');
const { pubClient, subClient } = require('./redis');

const app = express();
const server = http.createServer(app);

// Allowed origins configuration
const allowedOrigins = [
  'https://syncspace08.netlify.app',
  'http://localhost:5173',
  'http://localhost:5174',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      origin.endsWith('.netlify.app') ||
      origin.endsWith('.vercel.app');

    if (isAllowed) {
      callback(null, true);
    } else {
      // Return false gracefully instead of throwing an Error() instance
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200,
};

// 1. Explicitly respond to pre-flight OPTIONS requests across all routes
app.options('*', cors(corsOptions));

// 2. Register CORS middleware BEFORE rate limiters, helmet, and route mounts
app.use(cors(corsOptions));

// Security Headers (configured to allow cross-origin resource access)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: false,
  })
);

// Rate Limiting (applied specifically to /api routes and skips pre-flight OPTIONS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => req.method === 'OPTIONS',
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10kb' })); // Restrict payload size
app.use(cookieParser());

// Mount routes (supporting both /auth and /api/auth path structures)
app.use('/auth', authRoutes);
app.use('/documents', documentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Initialize WebSocket Server
initWebSocketServer(server);

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error('[SyncSpace Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`SyncSpace Server running on http://localhost:${PORT}`);
});

// Graceful Shutdown Handler
function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('HTTP and WebSocket servers closed.');
    try {
      await pubClient.quit();
      await subClient.quit();
      console.log('Redis connections closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));