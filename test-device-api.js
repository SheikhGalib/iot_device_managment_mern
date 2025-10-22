#!/usr/bin/env node

// Simple test script to check device data API
// Run with: node test-device-api.js

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001/api';

async function testDeviceAPI() {
  try {
    console.log('=== Testing Device API ===\n');
    
    // 1. Get all devices
    console.log('1. Fetching all devices...');
    const devicesResponse = await fetch(`${BASE_URL}/devices`);
    const devicesData = await devicesResponse.json();
    
    console.log(`Found ${devicesData.data?.length || 0} devices`);
    
    // Find IoT devices
    const iotDevices = devicesData.data?.filter(d => d.category === 'IoT') || [];
    console.log(`IoT devices: ${iotDevices.length}`);
    
    if (iotDevices.length > 0) {
      const testDevice = iotDevices[0];
      console.log(`\n2. Testing device: ${testDevice.name} (ID: ${testDevice._id})`);
      console.log(`   Status: ${testDevice.status}`);
      console.log(`   Last seen: ${testDevice.last_seen}`);
      console.log(`   Device key: ${testDevice.device_key}`);
      
      if (testDevice.current_data) {
        console.log(`   Current data structure:`, JSON.stringify(testDevice.current_data, null, 2));
        
        // Test individual data extraction
        const currentData = testDevice.current_data;
        
        console.log('\n3. Data extraction test:');
        
        if (currentData.temperature) {
          console.log(`   Temperature: ${currentData.temperature.value} ${currentData.temperature.unit}`);
        }
        
        if (currentData.humidity) {
          console.log(`   Humidity: ${currentData.humidity.value} ${currentData.humidity.unit}`);
        }
        
        if (currentData.led) {
          console.log(`   LED: ${currentData.led.state ? 'ON' : 'OFF'} (brightness: ${currentData.led.brightness})`);
        }
        
        if (currentData.gps) {
          console.log(`   GPS: ${currentData.gps.latitude}, ${currentData.gps.longitude}`);
        }
      } else {
        console.log('   No current_data available');
      }
      
      // 3. Test individual device fetch
      console.log(`\n4. Fetching individual device...`);
      const deviceResponse = await fetch(`${BASE_URL}/devices/${testDevice._id}`);
      const deviceData = await deviceResponse.json();
      
      console.log(`   Individual fetch result:`, deviceData.data?.current_data ? 'Has current_data' : 'No current_data');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testDeviceAPI();