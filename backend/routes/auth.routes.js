const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production-2024';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

// ===== LOGOWANIE =====
router.post('/login', (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: 'Name and password required' });
  }

  db.get(
    'SELECT id, name, password_hash, role, department, status FROM users WHERE name = ?',
    [name],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Porównaj hasło z hashem
      const isPasswordValid = bcrypt.compareSync(password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Utwórz JWT token
      const token = jwt.sign(
        {
          id: user.id,
          name: user.name,
          role: user.role,
          department: user.department
        },
        SECRET,
        { expiresIn: '24h' }
      );

      // Zaloguj akcję
      db.run(
        'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
        [user.id, 'login', `User ${user.name} logged in`]
      );

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          department: user.department
        }
      });
    }
  );
});

// ===== VERIFY TOKEN =====
router.post('/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ valid: false });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    res.json({ valid: true, user: decoded });
  } catch (err) {
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

module.exports = router;
