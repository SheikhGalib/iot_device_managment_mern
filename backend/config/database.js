const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async (retryCount = 0) => {
  const maxRetries = 5;
  const retryDelay = 5000; // 5 seconds

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

    return conn;

  } catch (error) {
    logger.error(`Error connecting to MongoDB (attempt ${retryCount + 1}/${maxRetries}):`, error.message);
    
    if (retryCount < maxRetries - 1) {
      logger.info(`Retrying connection in ${retryDelay / 1000} seconds...`);
      setTimeout(() => connectDB(retryCount + 1), retryDelay).unref();
      return;
    } else {
      logger.error('Max retry attempts reached. Please check MongoDB connection.');
      logger.error('Make sure MongoDB is running and accessible at:', process.env.MONGODB_URI);
      // Don't exit process, let the server run without database for now
    }
  }
};

module.exports = connectDB;