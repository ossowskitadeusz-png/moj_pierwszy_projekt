const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, chiefMiddleware } = require('../middleware/auth');

// ===== HELPER: Get current phase from DB based on time =====
async function getCurrentPhase(db) {
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
  
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM watch_phases 
       WHERE (start_time <= ? AND end_time > ?)
          OR (start_time > end_time AND (start_time <= ? OR end_time > ?))
       LIMIT 1`,
      [timeStr, timeStr, timeStr, timeStr],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || { phase_name: 'Off-Duty', phase_code: 'off_duty' });
      }
    );
  });
}

// ===== 1. GET MY STATUS (Data-Driven) =====
router.get('/my-status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const currentPhase = await getCurrentPhase(db);
    
    db.get(
      `SELECT * FROM daily_watch_assignment_v2 WHERE watch_date = DATE('now')`,
      (err, assignment) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let userRole = 'none';
        if (assignment) {
          if (assignment.morning_mechanic_id === userId) userRole = 'morning_watch';
          if (assignment.afternoon_mechanic_id === userId) userRole = 'afternoon_watch';
          if (assignment.night_mechanic_id === userId) userRole = 'night_watch';
        }

        res.json({
          phase: currentPhase.phase_code,
          phaseName: currentPhase.phase_name,
          phaseTask: currentPhase.description,
          phaseTime: `${currentPhase.start_time} - ${currentPhase.end_time}`,
          userRole: userRole,
          vesselCondition: assignment?.vessel_condition || 'at_sea'
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 2. GET TODAY'S FULL SCHEDULE =====
router.get('/today', authMiddleware, (req, res) => {
  db.get(
    `SELECT 
      d.watch_date, d.vessel_condition,
      m1.name as m1_name, d1.name as d1_name,
      m2.name as m2_name, d2.name as d2_name,
      m3.name as m3_name, d3.name as d3_name
     FROM daily_watch_assignment_v2 d
     LEFT JOIN users m1 ON d.morning_mechanic_id = m1.id
     LEFT JOIN users m2 ON d.afternoon_mechanic_id = m2.id
     LEFT JOIN users m3 ON d.night_mechanic_id = m3.id
     WHERE d.watch_date = DATE('now')`,
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    }
  );
});

// ===== 3. SAVE ASSIGNMENT (Chief Only) =====
router.post('/assignment', authMiddleware, chiefMiddleware, (req, res) => {
  const { watch_date, m1, m2, m3 } = req.body;
  
  db.run(
    `INSERT OR REPLACE INTO daily_watch_assignment_v2 
     (watch_date, morning_mechanic_id, afternoon_mechanic_id, night_mechanic_id)
     VALUES (?, ?, ?, ?)`,
    [watch_date, m1, m2, m3],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

module.exports = router;
