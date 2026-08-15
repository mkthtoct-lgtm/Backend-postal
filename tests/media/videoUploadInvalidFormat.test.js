const mediaController = require('../../src/controllers/media.controller');

async function runTest() {
  console.log('--- BẮT ĐẦU TEST videoUploadInvalidFormat.test.js ---');
  try {
    const req = {
      body: { category: 'video_library' },
      file: { originalname: 'malicious.exe', mimetype: 'application/x-msdownload', path: 'temp.exe' }
    };
    
    let statusCode = 0;
    let jsonResult = {};
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonResult = data; }
    };

    await mediaController.create(req, res);

    if (statusCode === 400 && jsonResult.success === false && jsonResult.message.includes('không được phép')) {
      console.log('✅ videoUploadInvalidFormat.test.js PASS');
    } else {
      console.error('❌ videoUploadInvalidFormat.test.js FAIL: Received status', statusCode, jsonResult);
    }
  } catch (error) {
    console.error('❌ videoUploadInvalidFormat.test.js FAIL', error);
  }
}

runTest();
