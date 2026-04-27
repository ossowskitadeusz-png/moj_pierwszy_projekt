const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production-2024';

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'No token provided',
      code: 'NO_TOKEN' 
    });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
};

// Dla Chief Engineer
const chiefMiddleware = (req, res, next) => {
  if (req.user.role !== 'chief_engineer') {
    return res.status(403).json({ 
      error: 'Only chief engineer can access this',
      code: 'FORBIDDEN'
    });
  }
  next();
};

module.exports = { authMiddleware, chiefMiddleware };
