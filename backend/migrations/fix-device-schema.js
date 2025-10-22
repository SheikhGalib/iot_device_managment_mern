const mongoose = require('mongoose');
require('dotenv').config();

console.log('MONGODB_URI:', process.env.MONGODB_URI);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/iot-device-management', {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

mongoose.connection.on('connected', () => {
  console.log('✅ Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('❌ Disconnected from MongoDB');
});

const Device = require('./models/Device');

const fixDeviceSchema = async () => {
  try {
    console.log('🔧 Starting device schema migration...');

    // Find all devices that might have schema issues
    const devices = await Device.find({});
    console.log(`Found ${devices.length} devices to check`);

    let fixedCount = 0;

    for (const device of devices) {
      let needsUpdate = false;
      const updates = {};

      // Fix category field - ensure it's set correctly
      if (!device.category) {
        if (['ESP32', 'ESP8266', 'Arduino', 'NodeMCU'].includes(device.type)) {
          updates.category = 'IoT';
          needsUpdate = true;
          console.log(`Setting category to 'IoT' for ${device.name} (${device.type})`);
        } else {
          updates.category = 'Computer';
          needsUpdate = true;
          console.log(`Setting category to 'Computer' for ${device.name} (${device.type})`);
        }
      }

      // Ensure supported_apis exists for IoT devices
      if (device.category === 'IoT' || updates.category === 'IoT') {
        if (!device.supported_apis) {
          updates.supported_apis = [];
          needsUpdate = true;
          console.log(`Initializing supported_apis for IoT device ${device.name}`);
        }
      }

      // Ensure current_data exists for IoT devices
      if (device.category === 'IoT' || updates.category === 'IoT') {
        if (!device.current_data) {
          updates.current_data = new Map();
          needsUpdate = true;
          console.log(`Initializing current_data for IoT device ${device.name}`);
        }
      }

      // Set default heartbeat_interval for IoT devices
      if ((device.category === 'IoT' || updates.category === 'IoT') && !device.heartbeat_interval) {
        updates.heartbeat_interval = 30000;
        needsUpdate = true;
        console.log(`Setting heartbeat_interval for IoT device ${device.name}`);
      }

      // For Computer devices, ensure required fields have defaults
      if (device.category === 'Computer' || updates.category === 'Computer') {
        if (!device.ssh_port) {
          updates.ssh_port = 22;
          needsUpdate = true;
        }
        if (!device.http_port) {
          updates.http_port = 8081;
          needsUpdate = true;
        }
        if (device.cpu_usage === undefined) {
          updates.cpu_usage = 0;
          needsUpdate = true;
        }
        if (device.ram_usage === undefined) {
          updates.ram_usage = 0;
          needsUpdate = true;
        }
        if (device.temperature === undefined) {
          updates.temperature = 0;
          needsUpdate = true;
        }
        if (device.active_sessions === undefined) {
          updates.active_sessions = 0;
          needsUpdate = true;
        }
      }

      // Ensure deployment_status is set
      if (!device.deployment_status) {
        updates.deployment_status = 'idle';
        needsUpdate = true;
      }

      // Apply updates if needed
      if (needsUpdate) {
        await Device.findByIdAndUpdate(device._id, updates);
        fixedCount++;
        console.log(`✅ Fixed device: ${device.name}`);
      }
    }

    console.log(`\n🎉 Migration completed! Fixed ${fixedCount} devices.`);

    // Show final device counts
    const iotCount = await Device.countDocuments({ category: 'IoT' });
    const computerCount = await Device.countDocuments({ category: 'Computer' });
    
    console.log(`\n📊 Device Summary:`);
    console.log(`   IoT Devices: ${iotCount}`);
    console.log(`   Computer Devices: ${computerCount}`);
    console.log(`   Total: ${iotCount + computerCount}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the migration
fixDeviceSchema();