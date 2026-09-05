const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'syncspace_super_secret_key';

function authenticateToken(req, res, next) {
  // Read token from HTTP cookie FIRST, then check Authorization header fallback
  const token = req.cookies?.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);

  if (!token) {
    return res.status(401).json({ error: 'NOT AUTHENTICATED' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken, JWT_SECRET };