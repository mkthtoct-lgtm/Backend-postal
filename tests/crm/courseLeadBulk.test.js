require('dotenv').config();
const mongoose = require('mongoose');
const courseLeadController = require('../../src/controllers/courseLead.controller');
const CourseLead = require('../../src/models/courseLead.model');
const CourseLeadAudit = require('../../src/models/courseLeadAudit.model');
const User = require('../../src/models/User');

async function runTest() {
  console.log('--- BẮT ĐẦU TEST BULK DELETE ---');
  try {
    // 1. Kết nối DB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Đã kết nối MongoDB');

    // 2. Tạo Admin User giả lập
    const adminUser = await User.create({
      email: `test_admin_${Date.now()}@hto.edu.vn`,
      passwordHash: 'password123',
      fullName: 'Test Admin',
      role: 'admin'
    });

    // 3. Tạo dữ liệu test
    const leadNormal = await CourseLead.create({
      customerName: 'Test Normal Lead',
      phoneNumber: '0900000001',
      normalizedPhone: '0900000001',
      courseId: new mongoose.Types.ObjectId(),
      courseNameSnapshot: 'Khóa học Test 1',
      status: 'NEW',
    });

    const leadKPI = await CourseLead.create({
      customerName: 'Test KPI Lead',
      phoneNumber: '0900000002',
      normalizedPhone: '0900000002',
      courseId: new mongoose.Types.ObjectId(),
      courseNameSnapshot: 'Khóa học Test 2',
      status: 'COMPLETED',
      proofStatus: 'APPROVED'
    });

    const fakeObjectId = new mongoose.Types.ObjectId().toString();
    const invalidId = 'this-is-not-objectid';

    // 4. Giả lập Request / Response
    const req = {
      user: { sub: adminUser._id, role: 'admin' },
      body: {
        ids: [
          leadNormal._id.toString(),
          leadKPI._id.toString(),
          fakeObjectId,
          invalidId
        ]
      }
    };

    const res = {
      statusCode: null,
      jsonData: null,
      status: function (code) { this.statusCode = code; return this; },
      json: function (data) { this.jsonData = data; return this; }
    };

    // 5. Gọi controller
    console.log('Gửi request bulkPermanentDelete...');
    await courseLeadController.bulkPermanentDelete(req, res);

    console.log(`Kết quả trả về: Status Code = ${res.statusCode}`);
    console.log(JSON.stringify(res.jsonData, null, 2));

    // 6. Assertions (Kiểm tra thực tế)
    if (res.statusCode !== 200) throw new Error('Test Fail: statusCode không phải 200');
    if (res.jsonData.deletedCount !== 1) throw new Error('Test Fail: deletedCount phải = 1');
    if (res.jsonData.failedCount !== 3) throw new Error('Test Fail: failedCount phải = 3');

    // Kiểm tra DB
    const checkLeadNormal = await CourseLead.findById(leadNormal._id);
    if (checkLeadNormal) throw new Error('Test Fail: Lead normal chưa bị xóa trong DB');

    const checkLeadKPI = await CourseLead.findById(leadKPI._id);
    if (!checkLeadKPI) throw new Error('Test Fail: Lead KPI bị xóa oan trong DB');

    const checkAudit = await CourseLeadAudit.findOne({ leadId: leadNormal._id });
    if (!checkAudit) throw new Error('Test Fail: Không tìm thấy Audit log');

    console.log('✅ TẤT CẢ TEST ĐỀU PASS!');

    // 7. Cleanup
    await CourseLead.findByIdAndDelete(leadKPI._id);
    await CourseLeadAudit.deleteMany({ leadId: leadNormal._id });
    await User.findByIdAndDelete(adminUser._id);
    console.log('Đã dọn dẹp dữ liệu rác.');
    
  } catch (err) {
    console.error('❌ LỖI TRONG QUÁ TRÌNH TEST:', err.message);
  } finally {
    mongoose.disconnect();
    console.log('Đã ngắt kết nối DB.');
  }
}

runTest();
