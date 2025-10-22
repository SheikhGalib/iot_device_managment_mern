const axios = require('axios');

async function createTestUser() {
  try {
    const response = await axios.post('http://localhost:3001/api/auth/register', {
      username: 'admin',
      email: 'admin@test.com', 
      password: 'admin123',
      role: 'admin'
    });
    
    console.log('✅ User created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating user:', error.response?.data || error.message);
  }
}

async function loginUser() {
  try {
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('✅ Login successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error logging in:', error.response?.data || error.message);
  }
}

async function testDevicesEndpoint(token) {
  try {
    const response = await axios.get('http://localhost:3001/api/devices', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Devices endpoint working:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error accessing devices:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('🚀 Testing backend API...');
  
  // Create user
  await createTestUser();
  
  // Login
  const loginResult = await loginUser();
  
  if (loginResult && loginResult.token) {
    // Test devices endpoint
    await testDevicesEndpoint(loginResult.token);
  }
}

main();