const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET || 'my-secret-key';
const rateLimit = require('express-rate-limit');

// ✅ Xác thực token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(403).json({ message: 'Forbidden - no token' });

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.status(403).json({ message: 'Forbidden - invalid token' });
    req.user = user;
    next();
  });
}

// ✅ Phân quyền
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden - insufficient role' });
    }
    next();
  };
}

// Rate limiter (10 req/min)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: req => req.user?.username || req.ip,
  handler: (req, res) => {
    res.status(409).json({ message: 'Too many requests - please wait.' });
  }
});

module.exports = {
  authenticateToken,
  requireRole,
  apiLimiter,
};
