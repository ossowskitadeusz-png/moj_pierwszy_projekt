const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, chiefMiddleware } = require('../middleware/auth');

// ===== GET ALL POTENTIAL WATCH KEEPERS =====
router.get('/eligible', authMiddleware, chiefMiddleware, (req, res) => {
  db.all(`SELECT id, name, role FROM users WHERE role IN ('mechanic', 'dayman')`, (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(users);
  });
});

// ===== GET CURRENT ASSIGNMENTS =====
router.get('/assignments', authMiddleware, (req, res) => {
  db.all(`SELECT * FROM mechanic_assignments WHERE status = 'active'`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ===== SAVE ASSIGNMENTS (CHIEF ONLY) =====
router.post('/save-assignments', authMiddleware, chiefMiddleware, (req, res) => {
  const { assignments } = req.body; // Array of {pos, mechanic_id, dayman_id}

  db.serialize(() => {
    // 1. Mark old as completed
    db.run(`UPDATE mechanic_assignments SET status = 'completed' WHERE status = 'active'`);
    
    // 2. Insert new
    const stmt = db.prepare(`INSERT INTO mechanic_assignments (mechanic_id, dayman_id, watch_position, start_date, status) VALUES (?, ?, ?, DATE('now'), 'active')`);
    
    assignments.forEach(a => {
      if (a.mechanic_id && a.dayman_id) {
        stmt.run(a.mechanic_id, a.dayman_id, a.pos);
      }
    });
    
    stmt.finalize((err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

module.exports = router;
