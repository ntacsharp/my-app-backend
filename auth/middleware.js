const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET || 'my-secret-key';

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

module.exports = {
  authenticateToken,
  requireRole,
};
