const mongoose = require('mongoose');
require('dotenv').config();

const Device = require('./models/Device');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/iot-device-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const findIoTDevices = async () => {
  try {
    console.log('🔍 Looking for IoT devices...');
    
    const iotDevices = await Device.find({ category: 'IoT' }).select('name device_key _id category type');
    
    console.log(`\n📱 Found ${iotDevices.length} IoT device(s):`);
    iotDevices.forEach(device => {
      console.log(`
  Name: ${device.name}
  Type: ${device.type}
  Category: ${device.category}
  Device Key: ${device.device_key}
  MongoDB ID: ${device._id}
      `);
    });

    if (iotDevices.length === 0) {
      console.log('❌ No IoT devices found. Please register an IoT device first.');
    } else {
      console.log('✅ Use the "Device Key" value in your ESP32 code, not the MongoDB ID.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
};

findIoTDevices();