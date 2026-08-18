const mongoose = require('mongoose');
require('dotenv').config({ path: 'g:/HTO IT/Portal/Backend-postal/.env' });

async function checkDb() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    const db = mongoose.connection.db;
    
    const depts = await db.collection('departments').countDocuments();
    const products = await db.collection('products').countDocuments();
    const crm = await db.collection('course_leads').countDocuments();
    const media = await db.collection('medias').countDocuments();
    
    console.log(`Departments count: ${depts}`);
    console.log(`Products count: ${products}`);
    console.log(`Course Leads count: ${crm}`);
    console.log(`Media count: ${media}`);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDb();
