const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// ===== POBIERZ ROZMOWĘ =====
router.get('/:userId', authMiddleware, (req, res) => {
  db.all(
    `SELECT m.*, 
            u1.name as from_name,
            u2.name as to_name
     FROM messages m
     LEFT JOIN users u1 ON m.from_user_id = u1.id
     LEFT JOIN users u2 ON m.to_user_id = u2.id
     WHERE (from_user_id = ? AND to_user_id = ?) 
        OR (from_user_id = ? AND to_user_id = ?)
     ORDER BY created_at ASC`,
    [req.user.id, req.params.userId, req.params.userId, req.user.id],
    (err, messages) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(messages || []);
    }
  );
});

// ===== WYŚLIJ WIADOMOŚĆ =====
router.post('/', authMiddleware, (req, res) => {
  const { to_user_id, content } = req.body;

  db.run(
    'INSERT INTO messages (from_user_id, to_user_id, content) VALUES (?, ?, ?)',
    [req.user.id, to_user_id, content],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, success: true });
    }
  );
});

module.exports = router;
