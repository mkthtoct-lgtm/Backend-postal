const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const connectDatabase = require('./configs/database');
const env = require('./configs/env');

const PORT = env.PORT;

connectDatabase();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});