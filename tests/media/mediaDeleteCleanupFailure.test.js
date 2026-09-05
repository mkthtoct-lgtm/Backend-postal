const mediaController = require('../../src/controllers/media.controller');

async function runTest() {
  console.log('--- BẮT ĐẦU TEST mediaDeleteCleanupFailure.test.js ---');
  try {
    const req = {
      params: { id: 'invalid_id' }
    };
    
    let statusCode = 0;
    let jsonResult = {};
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonResult = data; }
    };

    await mediaController.delete(req, res);

    // If ID is invalid, it throws 500 or 404
    if (statusCode === 404 || statusCode === 500) {
      console.log('✅ mediaDeleteCleanupFailure.test.js PASS');
    } else {
      console.error('❌ mediaDeleteCleanupFailure.test.js FAIL: Received status', statusCode, jsonResult);
    }
  } catch (error) {
    console.error('❌ mediaDeleteCleanupFailure.test.js FAIL', error);
  }
}

runTest();
