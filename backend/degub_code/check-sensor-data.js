const mongoose = require('mongoose');
const SensorData = require('./models/SensorData');
const Device = require('./models/Device');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/iot_device_management';

async function checkSensorData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Get all devices
    const devices = await Device.find({});
    console.log(`\nFound ${devices.length} devices:`);
    devices.forEach(device => {
      console.log(`- ${device.name} (${device._id}) - Status: ${device.status}`);
    });

    // Check sensor data count
    const sensorDataCount = await SensorData.countDocuments();
    console.log(`\nTotal sensor data records: ${sensorDataCount}`);

    if (sensorDataCount > 0) {
      // Get recent sensor data
      const recentData = await SensorData.find({})
        .sort({ timestamp: -1 })
        .limit(10)
        .populate('device_id', 'name');
      
      console.log('\nRecent sensor data:');
      recentData.forEach(data => {
        console.log(`- ${data.device_id?.name || 'Unknown'}: ${data.metric_type} = ${data.value}${data.unit} (${data.timestamp})`);
      });

      // Get data by metric type
      const metrics = await SensorData.distinct('metric_type');
      console.log(`\nAvailable metrics: ${metrics.join(', ')}`);

      for (const metric of metrics) {
        const count = await SensorData.countDocuments({ metric_type: metric });
        console.log(`- ${metric}: ${count} records`);
      }
    } else {
      console.log('\nNo sensor data found in database');
      console.log('This means either:');
      console.log('1. No ESP32 devices have sent data yet');
      console.log('2. The ESP32 devices are not configured correctly');
      console.log('3. The backend server is not receiving the data');
    }

  } catch (error) {
    console.error('Error checking sensor data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

async function createTestData() {
  try {
    console.log('Creating test sensor data...');
    await mongoose.connect(MONGODB_URI);

    // Find a device to create data for
    const device = await Device.findOne({ name: 'esp32-test' });
    if (!device) {
      console.log('No esp32-test device found. Creating test device...');
      const testDevice = new Device({
        name: 'esp32-test',
        device_key: 'test-device-key',
        type: 'esp32',
        status: 'online',
        model: 'ESP32-DevKit',
        location: 'Test Lab'
      });
      await testDevice.save();
      console.log('Test device created');
      device = testDevice;
    }

    // Create test data for the last 7 days
    const now = new Date();
    const testData = [];

    for (let days = 6; days >= 0; days--) {
      for (let hours = 0; hours < 24; hours += 2) { // Every 2 hours
        const timestamp = new Date(now.getTime() - days * 24 * 60 * 60 * 1000 + hours * 60 * 60 * 1000);
        
        // Temperature data (20-35°C with some variation)
        testData.push({
          device_id: device._id,
          device_key: device.device_key,
          metric_type: 'temperature',
          value: 22 + Math.sin(hours * 0.3) * 8 + Math.random() * 4,
          unit: 'Celsius',
          timestamp
        });

        // Humidity data (40-80% with variation)
        testData.push({
          device_id: device._id,
          device_key: device.device_key,
          metric_type: 'humidity',
          value: 60 + Math.cos(hours * 0.2) * 15 + Math.random() * 10,
          unit: '%',
          timestamp
        });

        // LED status (random on/off)
        testData.push({
          device_id: device._id,
          device_key: device.device_key,
          metric_type: 'led',
          value: Math.random() > 0.5 ? 1 : 0,
          unit: '',
          timestamp
        });
      }
    }

    await SensorData.insertMany(testData);
    console.log(`Created ${testData.length} test sensor data records`);

  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Check command line arguments
const action = process.argv[2];

if (action === 'create-test') {
  createTestData();
} else {
  checkSensorData();
}