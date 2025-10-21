const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/iot-device-management');

const Device = require('./models/Device');

const testDeviceRegistration = async () => {
  try {
    console.log('🧪 Testing new device registration...');

    // Test Edge Device Registration
    console.log('\n1. Testing Edge Device Registration:');
    const edgeDeviceData = {
      name: 'Test Raspberry Pi',
      type: 'Raspberry Pi',
      category: 'Computer',
      ip_address: '192.168.1.101',
      ssh_port: 22,
      ssh_username: 'pi',
      ssh_password: 'raspberry',
      mac_address: '11:22:33:44:55:66',
      device_key: 'test_edge_' + Date.now(),
      created_by: new mongoose.Types.ObjectId() // Mock user ID
    };

    const edgeDevice = await Device.create(edgeDeviceData);
    console.log('✅ Edge device created:', {
      id: edgeDevice._id,
      name: edgeDevice.name,
      category: edgeDevice.category,
      type: edgeDevice.type
    });

    // Test IoT Device Registration
    console.log('\n2. Testing IoT Device Registration:');
    const iotDeviceData = {
      name: 'Test ESP32',
      type: 'ESP32',
      category: 'IoT',
      description: 'Temperature sensor for testing',
      supported_apis: ['temperature-control', 'humidity-control'],
      device_key: 'test_iot_' + Date.now(),
      created_by: new mongoose.Types.ObjectId() // Mock user ID
    };

    const iotDevice = await Device.create(iotDeviceData);
    console.log('✅ IoT device created:', {
      id: iotDevice._id,
      name: iotDevice.name,
      category: iotDevice.category,
      type: iotDevice.type,
      supported_apis: iotDevice.supported_apis
    });

    // Test validation failures
    console.log('\n3. Testing validation failures:');
    
    try {
      // This should fail - IoT device without supported_apis
      await Device.create({
        name: 'Bad IoT Device',
        type: 'ESP32',
        category: 'IoT',
        device_key: 'bad_iot_' + Date.now(),
        created_by: new mongoose.Types.ObjectId()
      });
    } catch (error) {
      console.log('❌ Expected validation error for IoT device without supported_apis:', error.message);
    }

    try {
      // This should fail - Computer device without required SSH fields
      await Device.create({
        name: 'Bad Computer Device',
        type: 'Raspberry Pi',
        category: 'Computer',
        device_key: 'bad_computer_' + Date.now(),
        created_by: new mongoose.Types.ObjectId()
      });
    } catch (error) {
      console.log('❌ Expected validation error for Computer device without SSH fields:', error.message);
    }

    console.log('\n✅ All tests completed successfully!');

    // Clean up test devices
    await Device.deleteOne({ _id: edgeDevice._id });
    await Device.deleteOne({ _id: iotDevice._id });
    console.log('🧹 Test devices cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

testDeviceRegistration();