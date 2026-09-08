async function test() {
  try {
    const response = await fetch('http://localhost:3000/api/v1/media?limit=10');
    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('Error:', error);
  }
}
test();
