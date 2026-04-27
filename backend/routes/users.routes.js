const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// ===== POBIERZ ZESPÓŁ =====
router.get('/team', authMiddleware, (req, res) => {
  db.all(
    'SELECT id, name, role, status, department FROM users ORDER BY name',
    (err, users) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(users || []);
    }
  );
});

// ===== POBIERZ PROFIL UŻYTKOWNIKA =====
router.get('/profile/:id', authMiddleware, (req, res) => {
  db.get(
    'SELECT id, name, role, department, status FROM users WHERE id = ?',
    [req.params.id],
    (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(user);
    }
  );
});

module.exports = router;
