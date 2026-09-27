const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'syncspace_super_secret_key';

function verifyToken(req, res, next) {
  // Extract token from Authorization header OR httpOnly cookie
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = (authHeader && authHeader.split(' ')[1]) || req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attaches { id, email } to req.user
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { 
  verifyToken, 
  authenticateToken: verifyToken, 
  JWT_SECRET 
};