const express = require('express');
const client = require('prom-client');
const cors = require('cors');
const app = express();
const port = 5000;

app.use(cors());

client.collectDefaultMetrics();

const requestCounter = new client.Counter({
  name: 'backend_requests_total',
  help: 'Total HTTP requests to backend',
  labelNames: ['path', 'method'],
});

app.use((req, res, next) => {
  requestCounter.labels(req.path, req.method).inc();
  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

app.listen(port, () => {
  console.log(`Backend is running on port ${port}`);
});
