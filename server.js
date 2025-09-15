const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');

// Performance monitoring imports
const { performance } = require('perf_hooks');

// Configuration sécurisée des variables d'environnement
const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Validation de la configuration
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('❌ JWT_SECRET is required in production');
  process.exit(1);
}

// Configuration Next.js avec sécurité
const app = next({
  dev,
  hostname,
  port,
  conf: {
    poweredByHeader: false, // Sécurité: masquer l'en-tête X-Powered-By
  }
});
const handler = app.getRequestHandler();

// Configuration Prisma optimisée
const prisma = new PrismaClient({
  log: dev ? ['query', 'info', 'warn', 'error'] : ['error'],
  errorFormat: 'pretty',
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "file:./dev.db"
    }
  }
});

// Enhanced query performance monitoring
prisma.$on('query', (e) => {
  if (e.duration > 100) { // Log slow queries
    console.warn(`🐌 Slow query detected: ${e.query.substring(0, 100)}... (${e.duration}ms)`);
  }
});

// Redis configuration for clustering
let redisAdapter = null;
let redisClient = null;
let redisSubClient = null;

// Initialize Redis if available
async function initializeRedis() {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 300,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    redisSubClient = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 300,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    // Test connection
    await redisClient.ping();

    redisAdapter = createAdapter(redisClient, redisSubClient);
    console.log('✅ Redis adapter initialized for Socket.io clustering');

    return true;
  } catch (error) {
    console.warn('⚠️ Redis not available, running in single-instance mode:', error.message);
    return false;
  }
}

// Game state manager (will be replaced by Redis-based implementation)
const gameRooms = new Map();

// Performance monitoring utilities
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      connections: 0,
      activeGames: 0,
      messagesPerSecond: 0,
      avgResponseTime: 0,
      errorRate: 0
    };
    this.messageCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];

    // Reset metrics every minute
    setInterval(() => this.resetMetrics(), 60000);
  }

  trackConnection(increment = true) {
    this.metrics.connections += increment ? 1 : -1;
  }

  trackMessage() {
    this.messageCount++;
  }

  trackError() {
    this.errorCount++;
  }

  trackResponseTime(duration) {
    this.responseTimes.push(duration);
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-100); // Keep last 100
    }
    this.metrics.avgResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
  }

  resetMetrics() {
    this.metrics.messagesPerSecond = this.messageCount;
    this.metrics.errorRate = this.errorCount;
    this.metrics.activeGames = gameRooms.size;

    console.log('📊 Performance Metrics:', {
      connections: this.metrics.connections,
      activeGames: this.metrics.activeGames,
      messagesPerMinute: this.messageCount,
      errorsPerMinute: this.errorCount,
      avgResponseTime: `${this.metrics.avgResponseTime.toFixed(2)}ms`
    });

    this.messageCount = 0;
    this.errorCount = 0;
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

const performanceMonitor = new PerformanceMonitor();

// API performance tracking middleware
const trackApiPerformance = (apiName) => {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    performanceMonitor.trackResponseTime(duration);
    if (duration > 200) {
      console.warn(`⚠️ Slow API response: ${apiName} took ${duration.toFixed(2)}ms`);
    }
  };
};

// Enhanced error handling
class ErrorHandler {
  static handleSocketError(socket, error, context) {
    console.error(`Socket error in ${context}:`, error);
    performanceMonitor.trackError();

    socket.emit('error', {
      message: error.message || 'Une erreur est survenue',
      context,
      timestamp: Date.now()
    });
  }

  static handleDatabaseError(error, context) {
    console.error(`Database error in ${context}:`, error);
    performanceMonitor.trackError();
    // Could send to monitoring service like Sentry
  }

  static handleRedisError(error, context) {
    console.error(`Redis error in ${context}:`, error);
    // Redis errors are often non-fatal, continue with fallback
  }
}

// Enhanced game room management with Redis fallback
class GameRoomManager {
  constructor(io) {
    this.io = io;
    this.localRooms = new Map(); // Fallback for when Redis is unavailable
  }

  async getRoom(gameId) {
    // Try Redis first, fallback to local storage
    if (redisClient) {
      try {
        const roomData = await redisClient.get(`game:${gameId}`);
        if (roomData) {
          const room = JSON.parse(roomData);
          // Convert plain objects back to Maps
          if (room.players) {
            room.players = new Map(Object.entries(room.players));
          }
          if (room.answers) {
            room.answers = new Map(Object.entries(room.answers));
          }
          return room;
        }
      } catch (error) {
        ErrorHandler.handleRedisError(error, 'getRoom');
      }
    }

    return this.localRooms.get(gameId);
  }

  async setRoom(gameId, room) {
    // Update local storage
    this.localRooms.set(gameId, room);

    // Try to update Redis
    if (redisClient) {
      try {
        const roomData = {
          ...room,
          lastActivity: Date.now(),
          // Convert Map objects to plain objects for serialization
          players: room.players ? Object.fromEntries(room.players) : {},
          answers: room.answers ? Object.fromEntries(room.answers) : {}
        };

        await redisClient.setex(
          `game:${gameId}`,
          3600, // 1 hour TTL
          JSON.stringify(roomData)
        );
      } catch (error) {
        ErrorHandler.handleRedisError(error, 'setRoom');
      }
    }
  }

  async removeRoom(gameId) {
    this.localRooms.delete(gameId);

    if (redisClient) {
      try {
        await redisClient.del(`game:${gameId}`);
      } catch (error) {
        ErrorHandler.handleRedisError(error, 'removeRoom');
      }
    }
  }

  getAllRooms() {
    return this.localRooms;
  }
}

// Rate limiting with Redis support
class RateLimiter {
  constructor() {
    this.localLimits = new Map();
  }

  async checkRateLimit(key, maxRequests, windowMs) {
    if (redisClient) {
      try {
        const current = await redisClient.incr(key);
        if (current === 1) {
          await redisClient.pexpire(key, windowMs);
        }
        return current <= maxRequests;
      } catch (error) {
        ErrorHandler.handleRedisError(error, 'checkRateLimit');
      }
    }

    // Fallback to local rate limiting
    const now = Date.now();
    const userLimit = this.localLimits.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > userLimit.resetTime) {
      userLimit.count = 0;
      userLimit.resetTime = now + windowMs;
    }

    if (userLimit.count >= maxRequests) {
      return false;
    }

    userLimit.count++;
    this.localLimits.set(key, userLimit);
    return true;
  }
}

const rateLimiter = new RateLimiter();

console.log('Preparing Next.js app...');
app.prepare().then(async () => {
  console.log('Next.js app prepared successfully!');

  // Initialize Redis
  await initializeRedis();

  const server = createServer(async (req, res) => {
    const trackEnd = trackApiPerformance(`${req.method} ${req.url}`);

    try {
      const parsedUrl = parse(req.url, true);
      await handler(req, res, parsedUrl);
    } catch (error) {
      console.error('Handler error:', error.message);
      ErrorHandler.handleDatabaseError(error, 'requestHandler');

      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Internal Server Error');
      }
    } finally {
      trackEnd();
    }
  });

  // Configuration CORS sécurisée
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002'
      ];

  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? allowedOrigins : allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
      optionsSuccessStatus: 200
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    allowEIO3: true
  });

  // Apply Redis adapter if available
  if (redisAdapter) {
    io.adapter(redisAdapter);
    console.log('✅ Socket.io clustering enabled with Redis adapter');
  }

  // Initialize game room manager
  const gameRoomManager = new GameRoomManager(io);

  // Enhanced authentication middleware with performance tracking
  const authAttempts = new Map();

  io.use(async (socket, next) => {
    const trackEnd = trackApiPerformance('socket-auth');
    const clientIP = socket.handshake.address;
    const now = Date.now();

    try {
      // Rate limiting check
      const rateLimitKey = `auth:${clientIP}`;
      const allowed = await rateLimiter.checkRateLimit(rateLimitKey, 10, 60000);

      if (!allowed) {
        trackEnd();
        return next(new Error('Too many authentication attempts'));
      }

      const token = socket.handshake.auth?.token;
      if (!token || typeof token !== 'string') {
        trackEnd();
        return next(new Error('Authentication failed: No valid token'));
      }

      // JWT verification
      const JWT_SECRET = process.env.JWT_SECRET || (dev ? 'dev-secret-not-for-production-use-only' : null);

      if (!JWT_SECRET) {
        console.error('JWT_SECRET not configured');
        trackEnd();
        return next(new Error('Server configuration error'));
      }

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (jwtError) {
        trackEnd();
        if (jwtError.name === 'TokenExpiredError') {
          return next(new Error('Token expired'));
        } else if (jwtError.name === 'JsonWebTokenError') {
          return next(new Error('Invalid token'));
        }
        return next(new Error('Authentication failed'));
      }

      if (!decoded || !decoded.userId || typeof decoded.userId !== 'string') {
        trackEnd();
        return next(new Error('Authentication failed: Invalid token payload'));
      }

      // Database user verification with timeout
      const userPromise = prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true, avatar: true, createdAt: true }
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database timeout')), 5000);
      });

      const user = await Promise.race([userPromise, timeoutPromise]);

      if (!user) {
        trackEnd();
        return next(new Error('User not found'));
      }

      if (!user.username || user.username.trim().length === 0) {
        trackEnd();
        return next(new Error('Invalid user data'));
      }

      socket.userId = user.id;
      socket.user = {
        id: user.id,
        username: user.username,
        avatar: user.avatar || '🎭',
        joinedAt: user.createdAt
      };

      console.log(`✅ User ${user.username} (${user.id}) authenticated successfully`);
      trackEnd();
      next();

    } catch (error) {
      trackEnd();
      ErrorHandler.handleSocketError(socket, error, 'authentication');
      next(new Error('Authentication failed'));
    }
  });

  // Enhanced connection handling
  io.on('connection', (socket) => {
    console.log(`User ${socket.user.username} connected:`, socket.id);
    performanceMonitor.trackConnection(true);
    performanceMonitor.trackMessage();

    // Simple game handlers (your existing logic would go here)
    // For now, just implementing basic structure

    socket.on('join-game', async (data) => {
      const trackEnd = trackApiPerformance('join-game');
      try {
        performanceMonitor.trackMessage();

        const rateLimitKey = `join:${socket.userId}`;
        const allowed = await rateLimiter.checkRateLimit(rateLimitKey, 5, 1000);

        if (!allowed) {
          ErrorHandler.handleSocketError(socket, new Error('Rate limit exceeded'), 'join-game');
          return;
        }

        const { roomCode } = data;
        console.log(`${socket.user.username} joining game: ${roomCode}`);

        // Your existing join game logic here
        // This is a simplified version for demonstration

        socket.join(roomCode);
        socket.emit('joined-game', {
          roomCode,
          message: 'Successfully joined game'
        });

      } catch (error) {
        ErrorHandler.handleSocketError(socket, error, 'join-game');
      } finally {
        trackEnd();
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`User ${socket.user?.username} disconnected:`, socket.id, 'Reason:', reason);
      performanceMonitor.trackConnection(false);
    });

    // Add other socket handlers here following the same pattern
  });

  // Health check endpoint
  server.on('request', (req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        metrics: performanceMonitor.getMetrics(),
        redis: redisClient ? 'connected' : 'unavailable',
        uptime: process.uptime()
      }));
    }
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log('> Socket.io server initialized with enhanced architecture');
    if (redisAdapter) {
      console.log('> Redis clustering enabled');
    }
    console.log('> Performance monitoring active');
  });
});

// Enhanced graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`${signal} received`);

  try {
    // Close Redis connections
    if (redisClient) {
      await redisClient.quit();
      console.log('✅ Redis client disconnected');
    }
    if (redisSubClient) {
      await redisSubClient.quit();
      console.log('✅ Redis sub client disconnected');
    }

    // Close Prisma connection
    await prisma.$disconnect();
    console.log('✅ Prisma disconnected');

    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Unhandled error catching
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  performanceMonitor.trackError();
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  performanceMonitor.trackError();
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});