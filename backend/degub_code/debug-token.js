const axios = require('axios');

const debugToken = async () => {
  try {
    console.log('🔍 Debugging token response...');

    const baseURL = 'http://127.0.0.1:3001/api';
    
    const userData = {
      username: 'tokentest',
      email: 'token@test.com',
      password: 'password123'
    };

    let response;
    try {
      response = await axios.post(`${baseURL}/auth/register`, userData);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('User exists, trying login...');
        response = await axios.post(`${baseURL}/auth/login`, {
          email: userData.email,
          password: userData.password
        });
      } else {
        throw error;
      }
    }

    console.log('Full response data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
};

debugToken();