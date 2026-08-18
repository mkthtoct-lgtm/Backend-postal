const Media = require('../../../src/models/Media');

async function runTest() {
  console.log('--- BẮT ĐẦU TEST mediaBackwardCompatibility.test.js ---');
  try {
    const fields = Object.keys(Media.schema.paths);
    
    const requiredLegacyFields = [
      'title', 'category', 'thumbnail_url', 'imageFileId', 
      'imageMimeType', 'customer_name', 'country_tag'
    ];
    
    let allExist = true;
    for (const field of requiredLegacyFields) {
      if (!fields.includes(field)) {
        console.error(`❌ Lỗi Backward Compatibility: Thiếu field ${field}`);
        allExist = false;
      }
    }
    
    if (allExist) {
      console.log('✅ mediaBackwardCompatibility.test.js PASS');
    } else {
      console.error('❌ mediaBackwardCompatibility.test.js FAIL');
    }
  } catch (error) {
    console.error('❌ mediaBackwardCompatibility.test.js FAIL', error);
  }
}

runTest();
