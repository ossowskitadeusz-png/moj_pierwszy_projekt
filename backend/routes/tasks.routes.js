const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// ===== POBIERZ ZADANIA UŻYTKOWNIKA =====
router.get('/', authMiddleware, (req, res) => {
  db.all(
    `SELECT t.*, u.name as assigned_name, u2.name as creator_name
     FROM tasks t
     LEFT JOIN users u ON t.assigned_to = u.id
     LEFT JOIN users u2 ON t.created_by = u2.id
     WHERE t.assigned_to = ? OR t.created_by = ?
     ORDER BY t.due_date ASC`,
    [req.user.id, req.user.id],
    (err, tasks) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(tasks || []);
    }
  );
});

// ===== POBIERZ WSZYSTKIE ZADANIA (dla Chief) =====
router.get('/all', authMiddleware, (req, res) => {
  if (req.user.role !== 'chief_mechanic') {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.all(
    `SELECT t.*, u.name as assigned_name, u2.name as creator_name
     FROM tasks t
     LEFT JOIN users u ON t.assigned_to = u.id
     LEFT JOIN users u2 ON t.created_by = u2.id
     ORDER BY t.approval_status, t.due_date ASC`,
    (err, tasks) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(tasks || []);
    }
  );
});

// ===== UTWÓRZ ZADANIE =====
router.post('/', authMiddleware, (req, res) => {
  const { title, description, assigned_to, priority, due_date } = req.body;

  db.run(
    `INSERT INTO tasks (title, description, assigned_to, created_by, priority, due_date, status, approval_status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
    [title, description, assigned_to, req.user.id, priority, due_date],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      db.run(
        'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
        [req.user.id, 'task_created', `Task: ${title}`]
      );

      res.json({ id: this.lastID, title });
    }
  );
});

// ===== AKTUALIZUJ STATUS ZADANIA =====
router.put('/:id/status', authMiddleware, (req, res) => {
  const { status } = req.body;

  db.run(
    'UPDATE tasks SET status = ? WHERE id = ?',
    [status, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// ===== ZATWIERDŹ/ODRZUĆ ZADANIE (Chief) =====
router.put('/:id/approve', authMiddleware, (req, res) => {
  if (req.user.role !== 'chief_mechanic') {
    return res.status(403).json({ error: 'Only chief can approve' });
  }

  const { approval_status } = req.body;

  db.run(
    'UPDATE tasks SET approval_status = ? WHERE id = ?',
    [approval_status, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      db.run(
        'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
        [req.user.id, 'task_approved', `Task ID: ${req.params.id}, Status: ${approval_status}`]
      );

      res.json({ success: true });
    }
  );
});

module.exports = router;
