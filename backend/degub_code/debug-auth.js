const axios = require('axios');

const debugAuth = async () => {
  try {
    console.log('🔍 Debugging authentication...');

    const baseURL = 'http://127.0.0.1:3001/api';
    
    // Step 1: Register a user
    console.log('\n1. Registering user...');
    const userData = {
      username: 'debugtest',
      email: 'debug@test.com',
      password: 'password123'
    };

    let response;
    try {
      response = await axios.post(`${baseURL}/auth/register`, userData);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
        console.log('User already exists, attempting login...');
        response = await axios.post(`${baseURL}/auth/login`, {
          email: userData.email,
          password: userData.password
        });
      } else {
        throw error;
      }
    }

    console.log('✅ Auth response status:', response.status);
    console.log('📄 Response data structure:', Object.keys(response.data));
    console.log('🎫 Token preview:', response.data.token ? response.data.token.substring(0, 50) + '...' : 'NO TOKEN');

    const token = response.data.token;
    if (!token) {
      console.log('❌ No token received!');
      return;
    }

    // Step 2: Test /me endpoint
    console.log('\n2. Testing /me endpoint...');
    try {
      const meResponse = await axios.get(`${baseURL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ /me endpoint works:', meResponse.data.data.username);
    } catch (error) {
      console.log('❌ /me endpoint failed:', {
        status: error.response?.status,
        error: error.response?.data?.error
      });
    }

    // Step 3: Test device listing with detailed headers
    console.log('\n3. Testing device listing with debug...');
    try {
      console.log('📡 Sending request to:', `${baseURL}/devices`);
      console.log('🔑 Authorization header:', `Bearer ${token.substring(0, 20)}...`);
      
      const devicesResponse = await axios.get(`${baseURL}/devices`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Device listing works:', devicesResponse.data.data.devices.length, 'devices');
    } catch (error) {
      console.log('❌ Device listing failed:');
      console.log('  Status:', error.response?.status);
      console.log('  Error:', error.response?.data?.error);
      console.log('  Headers sent:', error.config?.headers);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
};

debugAuth();