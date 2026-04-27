const express = require('express');
const router = express.Router();
const db = require('../db');
const fs = require('fs').promises;
const path = require('path');
const { authMiddleware } = require('../middleware/auth');

const DATA_DIR = path.join(__dirname, '../../data');

// ===== POBIERZ FOLDERY DEPARTAMENTU =====
router.get('/', authMiddleware, (req, res) => {
  db.all(
    'SELECT * FROM folders WHERE department = ? ORDER BY created_at DESC',
    [req.user.department],
    (err, folders) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(folders || []);
    }
  );
});

// ===== UTWÓRZ FOLDER =====
router.post('/', authMiddleware, async (req, res) => {
  const { name } = req.body;
  
  if (!name) return res.status(400).json({ error: 'Folder name is required' });

  const folderRelPath = path.join(req.user.department, name);
  const fullPath = path.join(DATA_DIR, folderRelPath);

  try {
    // Utwórz folder w systemie plików
    await fs.mkdir(fullPath, { recursive: true });

    // Zapisz w bazie
    db.run(
      `INSERT INTO folders (name, path, owner_id, department)
       VALUES (?, ?, ?, ?)`,
      [name, folderRelPath, req.user.id, req.user.department],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Folder already exists' });
          }
          return res.status(500).json({ error: err.message });
        }

        db.run(
          'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
          [req.user.id, 'folder_created', `Folder: ${name} at ${folderRelPath}`]
        );

        res.json({ id: this.lastID, name, path: folderRelPath });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
