const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, chiefMiddleware } = require('../middleware/auth');

// ===== GET CURRENT INVENTORY (dla wszystkich zalogowanych) =====
router.get('/inventory', authMiddleware, (req, res) => {
  db.all(
    `SELECT 
      r.id,
      r.name,
      r.resource_type,
      r.category,
      r.current_level,
      r.max_capacity,
      r.unit,
      r.status,
      r.critical_threshold,
      r.warning_threshold,
      r.location,
      r.supplier,
      r.last_updated,
      r.is_critical,
      u.name as updated_by_name,
      ROUND((r.current_level / r.max_capacity * 100), 1) as percentage
     FROM resources r
     LEFT JOIN users u ON r.reported_by = u.id
     ORDER BY r.category, r.name`,
    (err, inventory) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(inventory || []);
    }
  );
});

// ===== GET RESOURCE DETAILS + HISTORY =====
router.get('/detail/:resourceId', authMiddleware, (req, res) => {
  db.get(
    `SELECT * FROM resources WHERE id = ?`,
    [req.params.resourceId],
    (err, resource) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!resource) return res.status(404).json({ error: 'Resource not found' });

      // Get last 30 entries of history
      db.all(
        `SELECT ih.*, u.name as recorded_by_name
         FROM inventory_history ih
         LEFT JOIN users u ON ih.recorded_by = u.id
         WHERE ih.resource_id = ? 
         ORDER BY ih.recorded_at DESC 
         LIMIT 30`,
        [req.params.resourceId],
        (err, history) => {
          resource.history = history || [];
          res.json(resource);
        }
      );
    }
  );
});

// ===== GET TANK DEFINITIONS =====
router.get('/tanks', authMiddleware, (req, res) => {
  const resourceType = req.query.type; // Optional filter by type (HFO, MDO, etc.)

  let query = 'SELECT * FROM tank_definitions';
  let params = [];

  if (resourceType) {
    query += ' WHERE resource_type = ?';
    params.push(resourceType);
  }

  query += ' ORDER BY resource_type, tank_name';

  db.all(query, params, (err, tanks) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(tanks || []);
  });
});

// ===== GET MY ASSIGNED REPORTS (dla crew member'a) =====
router.get('/reports/my', authMiddleware, (req, res) => {
  const crewId = req.user.id;

  db.all(
    `SELECT 
      rr.id,
      rr.report_type,
      rr.due_date,
      rr.status,
      rr.submitted_date,
      rr.submission_notes,
      rr.resource_id,
      r.name as resource_name,
      r.category,
      r.unit,
      u.name as assigned_by_name,
      CASE 
        WHEN rr.due_date < DATE('now') AND rr.status = 'pending' THEN 'overdue'
        ELSE rr.status
      END as actual_status
     FROM resource_reports rr
     LEFT JOIN resources r ON rr.resource_id = r.id
     LEFT JOIN users u ON rr.assigned_by = u.id
     WHERE rr.assigned_to = ?
     ORDER BY 
       CASE rr.status WHEN 'pending' THEN 1 WHEN 'overdue' THEN 0 WHEN 'submitted' THEN 2 ELSE 3 END,
       rr.due_date ASC`,
    [crewId],
    (err, reports) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(reports || []);
    }
  );
});

// ===== GET ALL REPORTS (Chief — overview of all pending/submitted) =====
router.get('/reports/all', authMiddleware, chiefMiddleware, (req, res) => {
  db.all(
    `SELECT 
      rr.id,
      rr.report_type,
      rr.due_date,
      rr.status,
      rr.submitted_date,
      rr.submission_notes,
      rr.verification_notes,
      r.name as resource_name,
      r.category,
      u1.name as assigned_to_name,
      u2.name as assigned_by_name,
      u3.name as verified_by_name,
      CASE 
        WHEN rr.due_date < DATE('now') AND rr.status = 'pending' THEN 'overdue'
        ELSE rr.status
      END as actual_status
     FROM resource_reports rr
     LEFT JOIN resources r ON rr.resource_id = r.id
     LEFT JOIN users u1 ON rr.assigned_to = u1.id
     LEFT JOIN users u2 ON rr.assigned_by = u2.id
     LEFT JOIN users u3 ON rr.verified_by = u3.id
     ORDER BY 
       CASE rr.status WHEN 'submitted' THEN 0 WHEN 'pending' THEN 1 WHEN 'overdue' THEN 0 ELSE 3 END,
       rr.due_date ASC`,
    (err, reports) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(reports || []);
    }
  );
});

// ===== GET DETAILED REPORT =====
router.get('/reports/:reportId/detail', authMiddleware, (req, res) => {
  db.get(
    `SELECT 
      rr.*,
      r.name as resource_name,
      r.category as resource_category,
      r.unit as resource_unit,
      u1.name as assigned_to_name,
      u2.name as assigned_by_name,
      u3.name as submitted_by_name,
      u4.name as verified_by_name
     FROM resource_reports rr
     LEFT JOIN resources r ON rr.resource_id = r.id
     LEFT JOIN users u1 ON rr.assigned_to = u1.id
     LEFT JOIN users u2 ON rr.assigned_by = u2.id
     LEFT JOIN users u3 ON rr.submitted_by = u3.id
     LEFT JOIN users u4 ON rr.verified_by = u4.id
     WHERE rr.id = ?`,
    [req.params.reportId],
    (err, report) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!report) return res.status(404).json({ error: 'Report not found' });

      // Get fuel soundings if fuel report
      if (report.report_type === 'fuel_sounding') {
        db.all(
          `SELECT 
            fs.*,
            td.tank_name,
            td.tank_code,
            td.capacity_cbm
           FROM fuel_soundings fs
           JOIN tank_definitions td ON fs.tank_id = td.id
           WHERE fs.report_id = ?
           ORDER BY td.tank_name`,
          [req.params.reportId],
          (err, soundings) => {
            report.soundings = soundings || [];
            res.json(report);
          }
        );
      } else {
        res.json(report);
      }
    }
  );
});

// ===== SUBMIT FUEL SOUNDING REPORT =====
router.post('/reports/:reportId/submit-fuel', authMiddleware, (req, res) => {
  const { soundings, notes } = req.body;
  const reportId = req.params.reportId;
  const crewId = req.user.id;

  if (!soundings || !Array.isArray(soundings) || soundings.length === 0) {
    return res.status(400).json({ error: 'At least one fuel tank sounding is required' });
  }

  // Use serialize to ensure proper transaction order
  db.serialize(() => {
    // Mark report as submitted
    db.run(
      `UPDATE resource_reports 
       SET status = 'submitted', submitted_date = CURRENT_TIMESTAMP, 
           submitted_by = ?, submission_notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [crewId, notes || '', reportId]
    );

    let completedCount = 0;

    // Insert each sounding
    soundings.forEach((sounding) => {
      const calculated_mt = (sounding.sounding_mm / 1000) * (sounding.capacity_cbm || 0) * (sounding.density_kg_cbm || 890) / 1000;

      db.run(
        `INSERT INTO fuel_soundings 
         (report_id, tank_id, sounding_mm, density_kg_cbm, temperature_celsius, calculated_mt, remarks, reported_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [reportId, sounding.tank_id, sounding.sounding_mm, sounding.density_kg_cbm || 890,
         sounding.temperature_celsius, calculated_mt, sounding.remarks || '', crewId],
        (err) => {
          completedCount++;

          if (err) {
            console.error('Sounding insert error:', err);
            return;
          }

          // When all soundings inserted, calculate total and log
          if (completedCount === soundings.length) {
            const totalMt = soundings.reduce((sum, s) => {
              return sum + ((s.sounding_mm / 1000) * (s.capacity_cbm || 0) * (s.density_kg_cbm || 890) / 1000);
            }, 0);

            // Log to inventory_history
            db.get('SELECT resource_id FROM resource_reports WHERE id = ?', [reportId], (err, rpt) => {
              if (rpt && rpt.resource_id) {
                db.run(
                  `INSERT INTO inventory_history 
                   (resource_id, level_after, change_reason, recorded_by)
                   VALUES (?, ?, 'report_submitted', ?)`,
                  [rpt.resource_id, totalMt, crewId]
                );
              }
            });

            // Audit log
            db.run(
              `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
               VALUES (?, ?, ?, ?, ?)`,
              [crewId, 'fuel_sounding_submitted', 'resource_reports', reportId,
               `Fuel sounding: ${soundings.length} tanks, Total: ${totalMt.toFixed(2)} MT`]
            );
          }
        }
      );
    });
  });

  res.json({ success: true, message: 'Fuel sounding report submitted successfully' });
});

// ===== SUBMIT GENERIC INVENTORY REPORT (Oil, Chemicals, Gas, etc.) =====
router.post('/reports/:reportId/submit', authMiddleware, (req, res) => {
  const { current_level, notes } = req.body;
  const reportId = req.params.reportId;
  const crewId = req.user.id;

  if (current_level === undefined || current_level < 0) {
    return res.status(400).json({ error: 'Valid current level is required' });
  }

  db.serialize(() => {
    // Update report status
    db.run(
      `UPDATE resource_reports 
       SET status = 'submitted', submitted_date = CURRENT_TIMESTAMP, 
           submitted_by = ?, submission_notes = ?,
           readings = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [crewId, notes || '', JSON.stringify({ level: current_level, timestamp: new Date().toISOString() }), reportId]
    );

    // Get resource_id from the report, then update resource level + log history
    db.get('SELECT resource_id FROM resource_reports WHERE id = ?', [reportId], (err, report) => {
      if (report && report.resource_id) {
        // Get old level for history
        db.get('SELECT current_level FROM resources WHERE id = ?', [report.resource_id], (err, resource) => {
          const oldLevel = resource ? resource.current_level : null;

          // Update inventory level
          db.run(
            `UPDATE resources 
             SET current_level = ?, last_updated = CURRENT_TIMESTAMP, 
                 reported_by = ?, updated_at = CURRENT_TIMESTAMP,
                 status = CASE
                   WHEN ? <= critical_threshold THEN 'critical'
                   WHEN ? <= warning_threshold THEN 'warning'
                   WHEN ? >= (max_capacity * 0.8) THEN 'optimal'
                   ELSE 'normal'
                 END
             WHERE id = ?`,
            [current_level, crewId, current_level, current_level, current_level, report.resource_id]
          );

          // Log history
          db.run(
            `INSERT INTO inventory_history 
             (resource_id, level_before, level_after, change_amount, change_reason, recorded_by)
             VALUES (?, ?, ?, ?, 'report_submitted', ?)`,
            [report.resource_id, oldLevel, current_level, current_level - (oldLevel || 0), crewId]
          );

          // Check if critical — create alert
          db.get('SELECT name, critical_threshold FROM resources WHERE id = ?', [report.resource_id], (err, res2) => {
            if (res2 && current_level <= res2.critical_threshold) {
              db.run(
                `INSERT INTO system_alerts (alert_type, severity, message, related_resource_id, related_resource_type)
                 VALUES ('resource_critical', 'critical', ?, ?, 'resources')`,
                [`CRITICAL: ${res2.name} level at ${current_level} (threshold: ${res2.critical_threshold})`, report.resource_id]
              );
            }
          });
        });

        // Audit log
        db.run(
          `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_value, details)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [crewId, 'inventory_report_submitted', 'resource_reports', reportId,
           String(current_level), `Inventory report submitted: ${current_level} units`]
        );
      }
    });
  });

  res.json({ success: true, message: 'Report submitted successfully' });
});

// ===== ASSIGN REPORT TO CREW (Chief only) =====
router.post('/assign-report', authMiddleware, chiefMiddleware, (req, res) => {
  const { crew_member_id, report_type, resource_id, due_date } = req.body;
  const chiefId = req.user.id;

  if (!crew_member_id || !report_type || !due_date) {
    return res.status(400).json({ error: 'Missing required fields: crew_member_id, report_type, due_date' });
  }

  if (!resource_id) {
    return res.status(400).json({ error: 'Resource ID is required' });
  }

  // Create inventory report
  db.run(
    `INSERT INTO resource_reports 
     (report_type, resource_id, assigned_to, assigned_by, due_date, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [report_type, resource_id, crew_member_id, chiefId, due_date],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      const reportId = this.lastID;

      // Get crew name for notification
      db.get('SELECT name FROM users WHERE id = ?', [crew_member_id], (err, crew) => {
        const crewName = crew ? crew.name : 'Unknown';

        // Send notification to crew member
        db.run(
          `INSERT INTO messages (from_user_id, to_user_id, content, type, priority)
           VALUES (?, ?, ?, 'notification', 'high')`,
          [chiefId, crew_member_id,
           `New inventory report assigned: ${report_type}. Due: ${due_date}`]
        );

        // Audit log
        db.run(
          `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
           VALUES (?, ?, ?, ?, ?)`,
          [chiefId, 'report_assigned', 'resource_reports', reportId,
           `${report_type} assigned to ${crewName}, due ${due_date}`]
        );
      });

      res.status(201).json({
        id: reportId,
        message: 'Report assigned successfully',
        reportId
      });
    }
  );
});

// ===== VERIFY REPORT (Chief only) =====
router.put('/reports/:reportId/verify', authMiddleware, chiefMiddleware, (req, res) => {
  const { verified, notes } = req.body;
  const reportId = req.params.reportId;
  const chiefId = req.user.id;

  const status = verified ? 'verified' : 'rejected';

  db.run(
    `UPDATE resource_reports 
     SET status = ?, verified_by = ?, verified_at = CURRENT_TIMESTAMP, 
         verification_notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [status, chiefId, notes || '', reportId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // Get report details for notification
      db.get(
        'SELECT assigned_to, report_type FROM resource_reports WHERE id = ?',
        [reportId],
        (err, report) => {
          if (report) {
            // Notify crew member
            db.run(
              `INSERT INTO messages (from_user_id, to_user_id, content, type)
               VALUES (?, ?, ?, 'notification')`,
              [chiefId, report.assigned_to,
               `Your ${report.report_type} report has been ${status}. ${notes || ''}`]
            );
          }

          // Audit
          db.run(
            `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_value, details)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [chiefId, 'report_verified', 'resource_reports', reportId, status,
             `Report ${verified ? 'verified' : 'rejected'}: ${notes || ''}`]
          );
        }
      );

      res.json({ success: true, message: `Report ${status}` });
    }
  );
});

// ===== GET INVENTORY TRENDS (Chart data) =====
router.get('/trends/:resourceId', authMiddleware, (req, res) => {
  db.all(
    `SELECT 
      ih.level_after,
      ih.level_before,
      ih.change_amount,
      ih.change_reason,
      ih.consumption_rate_per_day,
      ih.days_until_critical,
      ih.recorded_at,
      u.name as recorded_by_name
     FROM inventory_history ih
     LEFT JOIN users u ON ih.recorded_by = u.id
     WHERE ih.resource_id = ?
     ORDER BY ih.recorded_at DESC
     LIMIT 90`,
    [req.params.resourceId],
    (err, history) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(history || []);
    }
  );
});

// ===== GET RESOURCE ASSIGNMENTS (Chief — who is assigned to what) =====
router.get('/assignments', authMiddleware, chiefMiddleware, (req, res) => {
  db.all(
    `SELECT 
      ra.id,
      ra.report_type,
      ra.frequency,
      ra.status,
      ra.start_date,
      ra.end_date,
      ra.notes,
      r.name as resource_name,
      r.category,
      u1.name as crew_member_name,
      u2.name as assigned_by_name
     FROM resource_assignments ra
     LEFT JOIN resources r ON ra.resource_id = r.id
     LEFT JOIN users u1 ON ra.crew_member_id = u1.id
     LEFT JOIN users u2 ON ra.assigned_by = u2.id
     WHERE ra.status = 'active'
     ORDER BY ra.report_type, u1.name`,
    (err, assignments) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(assignments || []);
    }
  );
});

module.exports = router;
