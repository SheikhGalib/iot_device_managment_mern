require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to database with better error handling
const initializeDatabase = async () => {
  try {
    await connectDB();
    logger.info('Database connected successfully');
  } catch (err) {
    logger.error('Database connection failed:', err.message);
    // Exit process if database connection fails
    process.exit(1);
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'IoT Device Management Server is running',
    timestamp: new Date()
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/workspaces', require('./routes/workspaces'));

// Simple error handler
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await initializeDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Simple server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();