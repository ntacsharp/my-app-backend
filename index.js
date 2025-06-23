const express = require('express');
const client = require('prom-client');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { authenticateToken, requireRole } = require('./auth/middleware');

const app = express();
const port = 5000;
const secretKey = process.env.JWT_SECRET || 'my-secret-key';

app.use(cors());
app.use(express.json());

// Prometheus
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

// Fake users
const users = [
  { username: 'user', password: 'user', role: 'user' },
  { username: 'admin', password: 'admin', role: 'admin' },
];

// ✅ /api/login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(403).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ username: user.username, role: user.role }, secretKey, { expiresIn: '1h' });
  res.json({ token });
});

// ✅ Public
app.get('/api/hello', (req, res) => {
  res.send({ message: 'Hello from backend!' });
});

// ✅ User + Admin
app.get('/api/time', authenticateToken, requireRole('user', 'admin'), (req, res) => {
  res.send({ time: new Date().toISOString() });
});

// ✅ Admin only
app.post('/api/echo', authenticateToken, requireRole('admin'), (req, res) => {
  res.send({ received: req.body });
});

// ✅ Metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// ✅ Start server
app.listen(port, () => {
  console.log(`Backend is running on port ${port}`);
});
