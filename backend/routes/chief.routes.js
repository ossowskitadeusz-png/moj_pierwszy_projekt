const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, chiefMiddleware } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// ===== DASHBOARD STATS =====
router.get('/dashboard', authMiddleware, chiefMiddleware, (req, res) => {
  const stats = {};

  // Total crew
  db.get(
    'SELECT COUNT(*) as total, SUM(CASE WHEN status = "online" THEN 1 ELSE 0 END) as online FROM users WHERE role = "mechanic"',
    (err, crew) => {
      stats.crew = crew;

      // Active tasks
      db.get(
        'SELECT COUNT(*) as total FROM tasks WHERE status IN ("pending", "in_progress") AND approval_status = "approved"',
        (err, tasks) => {
          stats.activeTasks = tasks;

          // Alerts
          db.all(
            'SELECT * FROM system_alerts WHERE resolved = 0 ORDER BY severity DESC, created_at DESC LIMIT 10',
            (err, alerts) => {
              stats.alerts = alerts || [];

              // Resources
              db.all(
                'SELECT * FROM resources ORDER BY resource_type',
                (err, resources) => {
                  stats.resources = resources || [];
                  res.json(stats);
                }
              );
            }
          );
        }
      );
    }
  );
});

// ===== CREW MANAGEMENT =====

// Get all crew
router.get('/crew', authMiddleware, chiefMiddleware, (req, res) => {
  db.all(
    `SELECT u.id, u.name, u.role, u.status, u.sector_assignment, u.crew_number, 
            u.certifications, u.email, u.phone, u.last_activity, s.name as sector_name
     FROM users u
     LEFT JOIN sectors s ON u.sector_assignment = s.id
     WHERE u.role = "mechanic"
     ORDER BY u.status DESC, u.name`,
    (err, crew) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(crew || []);
    }
  );
});

// Invite new crew member
router.post('/crew/invite', authMiddleware, chiefMiddleware, (req, res) => {
  const { name, email, crew_number, certifications, phone } = req.body;
  const tempPassword = Math.random().toString(36).substring(2, 10);
  const passwordHash = bcrypt.hashSync(tempPassword, 10);

  db.run(
    `INSERT INTO users (name, password_hash, email, crew_number, certifications, phone, role, join_date)
     VALUES (?, ?, ?, ?, ?, ?, 'mechanic', DATE('now'))`,
    [name, passwordHash, email, crew_number, certifications, phone],
    function(err) {
      if (err) {
        return res.status(400).json({ error: 'Crew member already exists' });
      }

      const userId = this.lastID;

      db.run(
        'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'crew_invited', 'users', userId, `User ${name} invited with temp password`]
      );

      res.json({
        success: true,
        userId: userId,
        tempPassword: tempPassword,
        message: `User ${name} invited. Temporary password: ${tempPassword}`
      });
    }
  );
});

// ===== SECTORS MANAGEMENT =====

// Get all sectors with detailed info
router.get('/sectors', authMiddleware, chiefMiddleware, (req, res) => {
  db.all(
    `SELECT 
      s.id, 
      s.name, 
      s.description, 
      s.equipment, 
      s.criticality, 
      s.status,
      u.name as responsible_engineer,
      u.id as responsible_engineer_id,
      COUNT(DISTINCT crew.id) as assigned_crew,
      GROUP_CONCAT(crew.name, ', ') as crew_names,
      s.created_at,
      s.updated_at
     FROM sectors s
     LEFT JOIN users u ON s.responsible_engineer_id = u.id
     LEFT JOIN users crew ON crew.sector_assignment = s.id AND crew.role = 'mechanic'
     GROUP BY s.id
     ORDER BY CASE s.criticality 
       WHEN 'critical' THEN 1
       WHEN 'high' THEN 2
       WHEN 'normal' THEN 3
       ELSE 4 END, s.name`,
    (err, sectors) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(sectors || []);
    }
  );
});

// Get sector by ID
router.get('/sectors/:sectorId', authMiddleware, chiefMiddleware, (req, res) => {
  db.get(
    `SELECT 
      s.*, 
      u.name as responsible_engineer,
      COUNT(DISTINCT crew.id) as assigned_crew_count
     FROM sectors s
     LEFT JOIN users u ON s.responsible_engineer_id = u.id
     LEFT JOIN users crew ON crew.sector_assignment = s.id
     WHERE s.id = ?
     GROUP BY s.id`,
    [req.params.sectorId],
    (err, sector) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!sector) return res.status(404).json({ error: 'Sector not found' });
      res.json(sector);
    }
  );
});

// Create new sector
router.post('/sectors', authMiddleware, chiefMiddleware, (req, res) => {
  const { name, description, equipment, criticality } = req.body;

  // Validation
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Sector name is required' });
  }

  if (!['low', 'normal', 'high', 'critical'].includes(criticality)) {
    return res.status(400).json({ error: 'Invalid criticality level' });
  }

  // Check if sector already exists
  db.get('SELECT id FROM sectors WHERE name = ?', [name], (err, existing) => {
    if (existing) {
      return res.status(400).json({ error: 'Sector with this name already exists' });
    }

    db.run(
      `INSERT INTO sectors (name, description, equipment, criticality, status)
       VALUES (?, ?, ?, ?, 'operational')`,
      [name.trim(), description || '', equipment || '', criticality],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });

        const sectorId = this.lastID;

        // Audit log
        db.run(
          `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
           VALUES (?, ?, ?, ?, ?)`,
          [req.user.id, 'sector_created', 'sectors', sectorId, 
           `New sector created: ${name} (Criticality: ${criticality})`]
        );

        // System alert
        db.run(
          `INSERT INTO system_alerts (alert_type, severity, message, related_resource_type, related_resource_id)
           VALUES (?, ?, ?, ?, ?)`,
          ['manual_alert', 'info', `New sector created: ${name}`, 'sectors', sectorId]
        );

        res.status(201).json({
          id: sectorId,
          name,
          description,
          equipment,
          criticality,
          status: 'operational',
          assigned_crew: 0,
          message: `Sector "${name}" created successfully`
        });
      }
    );
  });
});

// Update sector
router.put('/sectors/:sectorId', authMiddleware, chiefMiddleware, (req, res) => {
  const { name, description, equipment, criticality, status, responsible_engineer_id } = req.body;
  const sectorId = req.params.sectorId;

  // Get old values for audit
  db.get('SELECT * FROM sectors WHERE id = ?', [sectorId], (err, oldSector) => {
    if (!oldSector) {
      return res.status(404).json({ error: 'Sector not found' });
    }

    const updates = [];
    const values = [];
    const changes = [];

    if (name !== undefined && name !== oldSector.name) {
      updates.push('name = ?');
      values.push(name);
      changes.push(`name: "${oldSector.name}" → "${name}"`);
    }

    if (description !== undefined && description !== oldSector.description) {
      updates.push('description = ?');
      values.push(description);
      changes.push(`description updated`);
    }

    if (equipment !== undefined && equipment !== oldSector.equipment) {
      updates.push('equipment = ?');
      values.push(equipment);
      changes.push(`equipment: "${oldSector.equipment}" → "${equipment}"`);
    }

    if (criticality !== undefined && criticality !== oldSector.criticality) {
      updates.push('criticality = ?');
      values.push(criticality);
      changes.push(`criticality: ${oldSector.criticality} → ${criticality}`);
    }

    if (status !== undefined && status !== oldSector.status) {
      updates.push('status = ?');
      values.push(status);
      changes.push(`status: ${oldSector.status} → ${status}`);
    }

    if (responsible_engineer_id !== undefined && responsible_engineer_id !== oldSector.responsible_engineer_id) {
      updates.push('responsible_engineer_id = ?');
      values.push(responsible_engineer_id);
      changes.push(`responsible engineer reassigned`);
    }

    if (updates.length === 0) {
      return res.json({ message: 'No changes made' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(sectorId);

    const query = `UPDATE sectors SET ${updates.join(', ')} WHERE id = ?`;

    db.run(query, values, (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // Audit log
      db.run(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
         VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, 'sector_updated', 'sectors', sectorId, changes.join('; ')]
      );

      res.json({ success: true, message: `Sector updated: ${changes.join('; ')}` });
    });
  });
});

// Delete sector (with safety check)
router.delete('/sectors/:sectorId', authMiddleware, chiefMiddleware, (req, res) => {
  const sectorId = req.params.sectorId;

  // Check if any crew is assigned to this sector
  db.get(
    'SELECT COUNT(*) as count FROM users WHERE sector_assignment = ?',
    [sectorId],
    (err, result) => {
      if (result.count > 0) {
        return res.status(400).json({
          error: `Cannot delete sector with ${result.count} assigned crew member(s)`,
          assignedCount: result.count
        });
      }

      db.get('SELECT name FROM sectors WHERE id = ?', [sectorId], (err, sector) => {
        if (!sector) {
          return res.status(404).json({ error: 'Sector not found' });
        }

        db.run(
          'DELETE FROM sectors WHERE id = ?',
          [sectorId],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });

            // Audit log
            db.run(
              `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
               VALUES (?, ?, ?, ?, ?)`,
              [req.user.id, 'sector_deleted', 'sectors', sectorId, `Sector deleted: ${sector.name}`]
            );

            res.json({ success: true, message: `Sector "${sector.name}" deleted successfully` });
          }
        );
      });
    }
  );
});

// Get sector templates (predefined)
router.get('/sectors-templates', authMiddleware, chiefMiddleware, (req, res) => {
  const templates = [
    {
      name: 'Main Engine Room',
      description: 'Primary diesel engine and main propulsion systems',
      equipment: 'MAN B&W 6S60ME, Turbocharger, Fuel Treatment System',
      criticality: 'critical'
    },
    {
      name: 'Auxiliary Engine Room',
      description: 'Diesel generators for electrical power generation',
      equipment: '2x Caterpillar CAT 3516 Gensets, Control Systems',
      criticality: 'critical'
    },
    {
      name: 'Boiler Deck',
      description: 'Steam boiler and exhaust gas treatment',
      equipment: 'Waste Heat Boiler, Economizer, SCR System',
      criticality: 'high'
    },
    {
      name: 'Purifier Room',
      description: 'Fuel and lube oil purification and storage',
      equipment: 'Centrifugal Purifiers, Storage Tanks, Heaters, Fuel Treatment',
      criticality: 'high'
    },
    {
      name: 'Cooling System',
      description: 'Seawater and freshwater cooling circuits',
      equipment: 'Heat Exchangers, Pumps, Filters, Valves',
      criticality: 'high'
    },
    {
      name: 'Electrical Distribution',
      description: 'Power distribution, switchboards, batteries',
      equipment: 'Main Switchboard, UPS Systems, Battery Banks, Circuit Breakers',
      criticality: 'critical'
    },
    {
      name: 'Water Maker Room',
      description: 'Fresh water production and storage',
      equipment: 'Reverse Osmosis Unit, Filters, Storage Tanks',
      criticality: 'normal'
    },
    {
      name: 'Incinerator Deck',
      description: 'Waste incineration and environmental control',
      equipment: 'Incinerator Unit, Stack, Monitoring Systems',
      criticality: 'high'
    }
  ];

  res.json(templates);
});

// Update sector status only (quick status change)
router.patch('/sectors/:sectorId/status', authMiddleware, chiefMiddleware, (req, res) => {
  const { status } = req.body;
  const sectorId = req.params.sectorId;

  if (!['operational', 'maintenance', 'critical', 'standby'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.run(
    'UPDATE sectors SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, sectorId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // Create alert if going critical
      if (status === 'critical') {
        db.get('SELECT name FROM sectors WHERE id = ?', [sectorId], (err, sector) => {
          db.run(
            `INSERT INTO system_alerts (alert_type, severity, message, related_resource_type, related_resource_id)
             VALUES (?, ?, ?, ?, ?)`,
            ['manual_alert', 'critical', `ALERT: Sector "${sector.name}" marked as CRITICAL`, 'sectors', sectorId]
          );
        });
      }

      // Audit log
      db.run(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_value)
         VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, 'sector_status_changed', 'sectors', sectorId, status]
      );

      res.json({ success: true, message: `Sector status updated to: ${status}` });
    }
  );
});

// ===== ASSIGN CREW MEMBER TO SECTOR =====
router.put('/crew/:crewId/assign-sector', authMiddleware, chiefMiddleware, (req, res) => {
  const { sector_id } = req.body;
  const crewId = req.params.crewId;

  // Get old sector assignment
  db.get('SELECT sector_assignment, name FROM users WHERE id = ?', [crewId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'Crew member not found' });

    const oldSector = user.sector_assignment;
    const crewName = user.name;

    // Update sector assignment
    db.run(
      'UPDATE users SET sector_assignment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [sector_id, crewId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Get new sector name
        db.get('SELECT name as sector_name FROM sectors WHERE id = ?', [sector_id], (err, newSector) => {
          const newSectorName = newSector?.sector_name || 'Unknown Sector';

          // Get old sector name for audit
          db.get('SELECT name as sector_name FROM sectors WHERE id = ?', [oldSector], (err, oldSectorObj) => {
            const oldSectorName = oldSectorObj?.sector_name || 'Unassigned';

            // Create audit log
            db.run(
              `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_value, new_value, details)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [req.user.id, 'crew_reassigned', 'sectors', crewId, oldSectorName, newSectorName, 
               `${crewName} reassigned from ${oldSectorName} to ${newSectorName}`],
              (err) => {
                if (err) console.error('Audit log error:', err);
              }
            );

            // Create notification for crew member
            db.run(
              `INSERT INTO messages (from_user_id, to_user_id, content, type, priority)
               VALUES (?, ?, ?, ?, ?)`,
              [req.user.id, crewId, `Your sector assignment has been changed to ${newSectorName}. Report to your new duty station immediately.`, 'notification', 'high'],
              (err) => {
                if (err) console.error('Message error:', err);
              }
            );

            // Create system alert
            db.run(
              `INSERT INTO system_alerts (alert_type, severity, message, related_user_id, related_resource_type, related_resource_id)
               VALUES (?, ?, ?, ?, ?, ?)`,
              ['manual_alert', 'info', `${crewName} reassigned to ${newSectorName}`, crewId, 'sectors', sector_id],
              (err) => {
                if (err) console.error('Alert error:', err);
              }
            );

            res.json({
              success: true,
              crewId,
              crewName,
              oldSector: oldSectorName,
              newSector: newSectorName
            });
          });
        });
      }
    );
  });
});

// ===== UNDO LAST ASSIGNMENT =====
router.post('/crew/:crewId/undo-assignment', authMiddleware, chiefMiddleware, (req, res) => {
  const crewId = req.params.crewId;

  // Get last change from audit log
  db.get(
    `SELECT old_value, resource_id FROM audit_logs 
     WHERE action = 'crew_reassigned' AND resource_id = ?
     ORDER BY created_at DESC LIMIT 1`,
    [crewId],
    (err, audit) => {
      if (err || !audit) {
        return res.status(400).json({ error: 'No previous assignment found' });
      }

      // Get sector ID from old_value (sector name)
      db.get(
        'SELECT id FROM sectors WHERE name = ?',
        [audit.old_value],
        (err, sector) => {
          if (err || !sector) {
            return res.status(400).json({ error: 'Could not restore previous sector' });
          }

          // Restore assignment
          db.run(
            'UPDATE users SET sector_assignment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [sector.id, crewId],
            (err) => {
              if (err) return res.status(500).json({ error: err.message });

              // Log undo
              db.run(
                `INSERT INTO audit_logs (user_id, action, details)
                 VALUES (?, ?, ?)`,
                [req.user.id, 'crew_assignment_undone', `Assignment for crew ${crewId} reverted to ${audit.old_value}`]
              );

              res.json({ success: true, message: `Assignment reverted to ${audit.old_value}` });
            }
          );
        }
      );
    }
  );
});

// ===== GET CREW MEMBER HISTORY =====
router.get('/crew/:crewId/history', authMiddleware, chiefMiddleware, (req, res) => {
  db.all(
    `SELECT action, old_value, new_value, details, created_at
     FROM audit_logs
     WHERE resource_id = ? AND action LIKE '%crew%'
     ORDER BY created_at DESC
     LIMIT 20`,
    [req.params.crewId],
    (err, history) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(history || []);
    }
  );
});

// ===== ALERTS MANAGEMENT =====
router.get('/alerts', authMiddleware, chiefMiddleware, (req, res) => {
  db.all(
    `SELECT a.*, u.name as user_name
     FROM system_alerts a
     LEFT JOIN users u ON a.related_user_id = u.id
     WHERE a.resolved = 0
     ORDER BY a.severity DESC, a.created_at DESC
     LIMIT 50`,
    (err, alerts) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(alerts || []);
    }
  );
});

// ===== RESOURCES MANAGEMENT =====
router.get('/resources', authMiddleware, chiefMiddleware, (req, res) => {
  db.all(
    `SELECT * FROM resources ORDER BY resource_type`,
    (err, resources) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(resources || []);
    }
  );
});

module.exports = router;
