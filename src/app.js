require('dotenv').config();
const express = require('express');
const http = require('http');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const { initWebSocketServer } = require('./websocket');
const { pubClient, subClient } = require('./redis');

const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS for Vercel frontend, local development, and preview deployments
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, mobile) or any vercel.app / localhost origin
    if (!origin || origin.includes('vercel.app') || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate Limiting: Max 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10kb' })); // Restrict payload size
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);

// Health check endpoint for Load Balancers (AWS ALB / Nginx)
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