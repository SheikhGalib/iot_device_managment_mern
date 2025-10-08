require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');
const { errorHandler, notFound } = require('./middleware/error');
const { generalRateLimit } = require('./middleware/rateLimiter');
const { initSocket, startDeviceMonitoring } = require('./utils/socket');
const sshManager = require('./utils/sshManager');
const logger = require('./utils/logger');

// Connect to database
connectDB().catch((err) => {
  logger.error('Failed to connect to database:', err);
  // Continue without database for now
});

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ["http://localhost:3000", "http://localhost:5173"],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api', generalRateLimit);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'IoT Device Management Server is running',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/devices', require('./routes/devices'));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/dist', 'index.html'));
  });
}

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

server.listen(PORT, 'localhost', () => {
  logger.info(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  
  // Start device monitoring after server starts (disabled for now)
  // setTimeout(() => {
  //   startDeviceMonitoring();
  //   logger.info('Device monitoring started');
  // }, 5000);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close all SSH connections
    sshManager.disconnectAll();
    
    // Close database connection
    require('mongoose').connection.close(() => {
      logger.info('Database connection closed');
      process.exit(0);
    });
  });

  // Force close server after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', err);
  gracefulShutdown('unhandledRejection');
});

module.exports = app;