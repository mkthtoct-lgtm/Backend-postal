// Scratch script to test findSchools function locally
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config();

const schoolService = require('./src/services/school.service');

async function run() {
  try {
    console.log("Connecting to Mongo...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected. Testing findSchools...");
    
    const result = await schoolService.findSchools({
      country: 'all',
      program: 'all',
      search: ''
    });
    
    console.log("Success! Headers count:", result.headers.length);
    console.log("Records count:", result.records.length);
  } catch (err) {
    console.error("Test failed with error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
