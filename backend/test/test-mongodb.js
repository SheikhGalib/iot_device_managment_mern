const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    const conn = await mongoose.connect('mongodb://127.0.0.1:27017/iot-device-management');
    console.log('✅ MongoDB Connected successfully!');
    console.log('Host:', conn.connection.host);
    console.log('Database:', conn.connection.name);
    
    // Create a test collection to ensure database is working
    const testSchema = new mongoose.Schema({ name: String });
    const TestModel = mongoose.model('Test', testSchema);
    
    await TestModel.create({ name: 'Connection Test' });
    console.log('✅ Test document created successfully!');
    
    await mongoose.connection.close();
    console.log('✅ Connection closed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();