// Migration script to add created_by field to existing devices
require('dotenv').config();
const mongoose = require('mongoose');
const Device = require('./models/Device');
const User = require('./models/User');

async function migrateDevices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the first user (admin user)
    const firstUser = await User.findOne().sort({ createdAt: 1 });
    if (!firstUser) {
      console.log('No users found. Please create a user first.');
      return;
    }

    console.log(`Using user: ${firstUser.email} as owner for existing devices`);

    // Update all devices without created_by field
    const result = await Device.updateMany(
      { created_by: { $exists: false } },
      { $set: { created_by: firstUser._id } }
    );

    console.log(`Updated ${result.modifiedCount} devices`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

migrateDevices();