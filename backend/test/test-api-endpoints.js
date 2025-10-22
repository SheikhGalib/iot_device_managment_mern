const axios = require('axios');

const testAPI = async () => {
  try {
    console.log('🧪 Testing API endpoints...');

    const baseURL = 'http://127.0.0.1:3001/api';
    
    // First, let's try to register a user and get a token for authentication
    console.log('\n1. Testing user registration/login...');
    
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };

    let token;
    try {
      const registerResponse = await axios.post(`${baseURL}/auth/register`, userData);
      token = registerResponse.data.data.token;
      console.log('✅ User registered successfully');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
        // User already exists, try to login
        console.log('User already exists, attempting login...');
        const loginResponse = await axios.post(`${baseURL}/auth/login`, {
          email: userData.email,
          password: userData.password
        });
        token = loginResponse.data.data.token;
        console.log('✅ User logged in successfully');
      } else {
        throw error;
      }
    }

    // Test Edge Device Registration
    console.log('\n2. Testing Edge Device Registration via API...');
    const edgeDeviceData = {
      name: 'API Test Raspberry Pi',
      type: 'Raspberry Pi',
      category: 'Computer',
      ip_address: '192.168.1.102',
      ssh_port: 22,
      ssh_username: 'pi',
      ssh_password: 'raspberry',
      mac_address: '11:22:33:44:55:67',
      device_key: 'api_test_edge_' + Date.now()
    };

    try {
      const edgeResponse = await axios.post(`${baseURL}/devices/register`, edgeDeviceData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Edge device registered via API:', {
        id: edgeResponse.data.data._id,
        name: edgeResponse.data.data.name,
        category: edgeResponse.data.data.category
      });
    } catch (error) {
      console.error('❌ Edge device registration failed:', {
        status: error.response?.status,
        error: error.response?.data?.error || error.message
      });
    }

    // Test IoT Device Registration
    console.log('\n3. Testing IoT Device Registration via API...');
    const iotDeviceData = {
      name: 'API Test ESP32',
      type: 'ESP32',
      category: 'IoT',
      description: 'Temperature sensor for API testing',
      supported_apis: ['temperature-control', 'led-control'],
      device_key: 'api_test_iot_' + Date.now()
    };

    try {
      const iotResponse = await axios.post(`${baseURL}/devices/register`, iotDeviceData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ IoT device registered via API:', {
        id: iotResponse.data.data._id,
        name: iotResponse.data.data.name,
        category: iotResponse.data.data.category,
        supported_apis: iotResponse.data.data.supported_apis
      });
    } catch (error) {
      console.error('❌ IoT device registration failed:', {
        status: error.response?.status,
        error: error.response?.data?.error || error.message
      });
    }

    // Test getting devices
    console.log('\n4. Testing device listing...');
    try {
      const devicesResponse = await axios.get(`${baseURL}/devices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Devices retrieved:', {
        total: devicesResponse.data.data.devices.length,
        devices: devicesResponse.data.data.devices.map(d => ({
          name: d.name,
          category: d.category,
          type: d.type
        }))
      });
    } catch (error) {
      console.error('❌ Device listing failed:', {
        status: error.response?.status,
        error: error.response?.data?.error || error.message
      });
    }

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
};

testAPI();