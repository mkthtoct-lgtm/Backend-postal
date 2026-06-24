const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Product = require('../models/Product');
const connectDatabase = require('../configs/database');

const productsToSeed = [
  // HÀN QUỐC
  { name: 'D41', country: 'Hàn Quốc', serviceFee: 85000000 },
  { name: 'D22', country: 'Hàn Quốc', serviceFee: 85000000 },
  { name: 'D26', country: 'Hàn Quốc', serviceFee: 150000000 },
  
  // ĐÀI LOAN
  { name: 'VHVL + 1 + 4', country: 'Đài Loan', serviceFee: 45000000 },
  { name: 'Intense', country: 'Đài Loan', serviceFee: 45000000 },
  { name: 'Intership (6 tháng)', country: 'Đài Loan', serviceFee: 40500000 },
  { name: 'Intership (1 năm)', country: 'Đài Loan', serviceFee: 45900000 },
  
  // ĐỨC
  { name: 'Du học nghề', country: 'Đức', serviceFee: 220000000 },
  { name: 'DHN học tiếng', country: 'Đức', serviceFee: 360000000 }
];

async function seed() {
  try {
    await connectDatabase();
    console.log('Database connected successfully for seeding.');

    for (const prodData of productsToSeed) {
      const filter = { 
        name: prodData.name, 
        country: { $in: [prodData.country, prodData.country === 'Hàn Quốc' ? 'KR' : prodData.country === 'Đài Loan' ? 'TW' : 'DE'] } 
      };
      
      const update = {
        name: prodData.name,
        country: prodData.country === 'Hàn Quốc' ? 'KR' : prodData.country === 'Đài Loan' ? 'TW' : 'DE',
        serviceFee: prodData.serviceFee,
        isActive: true,
        deletedAt: null
      };

      const result = await Product.findOneAndUpdate(
        { name: prodData.name },
        { $set: update },
        { upsert: true, new: true }
      );
      console.log(`Upserted Product: "${result.name}" (${result.country}) -> ServiceFee: ${result.serviceFee}`);
    }

    console.log('Seeding products completed successfully!');
  } catch (error) {
    console.error('Error seeding products:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
}

// Nếu chạy trực tiếp từ CLI
if (require.main === module) {
  seed();
}

module.exports = seed;
