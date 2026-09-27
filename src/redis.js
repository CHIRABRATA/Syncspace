const Redis = require('ioredis');

// Redis configuration (reads from process.env or defaults to localhost)
const redisConfig = process.env.REDIS_URL || {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
};

// Redis requires separate client instances for Publishing and Subscribing
const pubClient = new Redis(redisConfig);
const subClient = new Redis(redisConfig);

pubClient.on('connect', () => console.log('Redis Publisher Connected'));
subClient.on('connect', () => console.log('Redis Subscriber Connected'));

pubClient.on('error', (err) => console.error('Redis Pub Error:', err));
subClient.on('error', (err) => console.error('Redis Sub Error:', err));

module.exports = { pubClient, subClient };