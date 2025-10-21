const mongoose = require('mongoose');
const Device = require('./models/Device');
require('dotenv').config();

async function updateDevicesWithHttpPort() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iot_device_management');
    console.log('Connected to MongoDB');

    // Update all devices that don't have http_port field
    const result = await Device.updateMany(
      { http_port: { $exists: false } },
      { $set: { http_port: 8081 } }
    );

    console.log(`Updated ${result.modifiedCount} devices with http_port field`);

    // List all devices to verify
    const devices = await Device.find({}, 'name ip_address http_port ssh_port').lean();
    console.log('\nAll devices:');
    devices.forEach(device => {
      console.log(`- ${device.name}: IP=${device.ip_address}, HTTP=${device.http_port}, SSH=${device.ssh_port}`);
    });

    console.log('\nUpdate completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error updating devices:', error);
    process.exit(1);
  }
}

updateDevicesWithHttpPort();