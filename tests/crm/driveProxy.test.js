const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runTest() {
  console.log('--- STARTING DRIVE PROXY TEST ---');
  try {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    const googleDriveService = require('../../src/services/googleDrive.service');
    
    // Create a dummy file
    const dummyPath = path.join(__dirname, 'dummy.txt');
    fs.writeFileSync(dummyPath, 'This is a test image content');
    
    const mockFile = {
      path: dummyPath,
      originalname: 'test_image.png',
      mimetype: 'image/png'
    };
    
    console.log('Uploading file to Google Drive...');
    const driveResult = await googleDriveService.uploadFile(mockFile);
    console.log('Upload Result:', driveResult);
    
    if (!driveResult || !driveResult.fileId) {
      throw new Error('Failed to upload to Drive');
    }
    
    // Test the proxy endpoint
    const fileId = driveResult.fileId;
    console.log(`Testing Proxy Endpoint: GET http://localhost:3000/api/v1/drive/${fileId}`);
    
    const proxyRes = await fetch(`http://localhost:3000/api/v1/drive/${fileId}`);
    console.log(`Proxy Response Status: ${proxyRes.status}`);
    console.log(`Proxy Content-Type: ${proxyRes.headers.get('content-type')}`);
    
    if (proxyRes.status !== 200) {
      throw new Error(`Proxy failed with status ${proxyRes.status}`);
    }
    
    if (!proxyRes.headers.get('content-type').includes('image/png')) {
      throw new Error(`Wrong Content-Type: ${proxyRes.headers.get('content-type')}`);
    }
    
    // Read the stream
    const buffer = await proxyRes.arrayBuffer();
    console.log(`Downloaded ${buffer.byteLength} bytes from Proxy.`);
    
    console.log('✅ DRIVE PROXY TEST PASS!');
    
    // Cleanup
    await googleDriveService.deleteFile(fileId);
    fs.unlinkSync(dummyPath);
    console.log('Cleaned up file on Drive.');
    
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
  } finally {
    process.exit(0);
  }
}

runTest();
