const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Backend Postal API is running',
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'backend-postal',
  });
});

module.exports = app;