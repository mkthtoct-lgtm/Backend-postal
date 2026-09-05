const mediaController = require('../../src/controllers/media.controller');

async function runTest() {
  console.log('--- BẮT ĐẦU TEST documentUploadInvalidFormat.test.js ---');
  try {
    const req = {
      body: { category: 'document' },
      file: { originalname: 'script.js', mimetype: 'application/javascript', path: 'temp.js' }
    };
    
    let statusCode = 0;
    let jsonResult = {};
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonResult = data; }
    };

    await mediaController.create(req, res);

    if (statusCode === 400 && jsonResult.success === false && jsonResult.message.includes('không được phép')) {
      console.log('✅ documentUploadInvalidFormat.test.js PASS');
    } else {
      console.error('❌ documentUploadInvalidFormat.test.js FAIL: Received status', statusCode, jsonResult);
    }
  } catch (error) {
    console.error('❌ documentUploadInvalidFormat.test.js FAIL', error);
  }
}

runTest();
