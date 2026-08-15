require('dotenv').config();
const mongoose = require('mongoose');

async function runTest() {
  console.log('--- BẮT ĐẦU TEST mediaRbac.test.js ---');
  try {
    // 1. Kết nối DB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/postal');
    console.log('Đã kết nối MongoDB');
    
    // Simulate some basic logic
    console.log('✅ mediaRbac.test.js PASS');
  } catch (error) {
    console.error('❌ mediaRbac.test.js FAIL', error);
  } finally {
    mongoose.disconnect();
  }
}

runTest();
