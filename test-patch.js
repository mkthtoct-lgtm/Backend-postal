const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const User = require('./src/models/User');

async function test() {
  try {
    // Connect to database
    console.log('Connecting to database...', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // 1. Register a new user
    const email = `test_${Date.now()}@gmail.com`;
    const password = 'Password123!';
    const fullName = 'Test User';
    
    console.log('Registering user...');
    const registerRes = await fetch('http://localhost:3000/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName })
    });
    const registerData = await registerRes.json();
    console.log('Register response:', registerData);
    
    if (!registerData.success) {
      console.error('Registration failed');
      return;
    }
    
    const userId = registerData.data.id;
    
    // 2. Make the user an admin in the database
    console.log('Promoting user to Admin in DB...');
    const ADMIN_ROLE_ID = '69fc5af582ef85451120772a';
    await User.findByIdAndUpdate(userId, { roleId: ADMIN_ROLE_ID, status: 'active' });
    console.log('Promoted successfully');

    // 3. Login to get token
    console.log('Logging in...');
    const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    console.log('Login response:', loginData);
    
    const token = loginData.data.access_token;
    console.log('Token:', token);

    // 4. Create category using POST (JSON)
    console.log('Creating category using JSON POST...');
    const createJsonRes = await fetch('http://localhost:3000/api/v1/product-categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: `JSON Category ${Date.now()}`,
        description: 'Test category created via JSON',
        status: 'active'
      })
    });
    const createJsonData = await createJsonRes.json();
    console.log('JSON POST Create Response:', createJsonData);

    const catId = createJsonData.data?._id || createJsonData.data?.id;
    if (!catId) {
      console.error('Category creation failed');
      return;
    }

    // 5. Update category using PATCH (JSON)
    console.log(`Updating category ${catId} using JSON PATCH...`);
    const updateJsonRes = await fetch(`http://localhost:3000/api/v1/product-categories/${catId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: `Updated Category JSON ${Date.now()}`,
        description: 'Updated description',
        status: 'active'
      })
    });
    const updateJsonData = await updateJsonRes.json();
    console.log('JSON PATCH Update Response:', updateJsonData);

    // 6. Create category using FormData (simulating image upload)
    console.log('Creating category using FormData POST...');
    const formCreate = new FormData();
    formCreate.append('name', `FormData Category ${Date.now()}`);
    formCreate.append('description', 'Test category created via FormData');
    formCreate.append('status', 'active');
    formCreate.append('coverImage', new Blob(['fake image data'], { type: 'image/png' }), 'test_create.png');

    const createFormRes = await fetch('http://localhost:3000/api/v1/product-categories', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formCreate
    });
    const createFormData = await createFormRes.json();
    console.log('FormData POST Create Response:', createFormData);

    const catId2 = createFormData.data?._id || createFormData.data?.id;
    if (!catId2) {
      console.error('Category creation via FormData failed');
      return;
    }

    // 7. Update category using FormData PATCH
    console.log(`Updating category ${catId2} using FormData PATCH...`);
    const formUpdate = new FormData();
    formUpdate.append('name', `Updated Category FormData ${Date.now()}`);
    formUpdate.append('description', 'Updated description via FormData');
    formUpdate.append('status', 'active');
    formUpdate.append('coverImage', new Blob(['updated fake image data'], { type: 'image/png' }), 'test_update.png');

    const updateFormRes = await fetch(`http://localhost:3000/api/v1/product-categories/${catId2}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formUpdate
    });
    const updateFormData = await updateFormRes.json();
    console.log('FormData PATCH Update Response:', updateFormData);

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB');
  }
}

test();
