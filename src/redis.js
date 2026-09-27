require('dotenv').config();
const Redis = require('ioredis');

// Redis configuration (reads from process.env or defaults to localhost)
const redisConfig = process.env.REDIS_URL || {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
};

const clientOptions = {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    return Math.min(times * 100, 3000);
  },
};

// Redis requires separate client instances for Publishing and Subscribing
const pubClient = typeof redisConfig === 'string'
  ? new Redis(redisConfig, clientOptions)
  : new Redis({ ...redisConfig, ...clientOptions });

const subClient = typeof redisConfig === 'string'
  ? new Redis(redisConfig, clientOptions)
  : new Redis({ ...redisConfig, ...clientOptions });

pubClient.on('connect', () => console.log('Redis Publisher Connected'));
subClient.on('connect', () => console.log('Redis Subscriber Connected'));

pubClient.on('error', (err) => console.error('Redis Pub Error:', err.message));
subClient.on('error', (err) => console.error('Redis Sub Error:', err.message));

module.exports = { pubClient, subClient };