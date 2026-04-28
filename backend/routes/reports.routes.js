const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, chiefMiddleware } = require('../middleware/auth');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

// Konfiguracja zapisu plików
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'backend/uploads/reports/');
  },
  filename: (req, file, cb) => {
    const reportId = req.params.reportId;
    cb(null, `report_${reportId}_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

// ===== 1. POBIERANIE SZABLONU (TEMPLATE) =====
router.get('/template/:reportId', authMiddleware, (req, res) => {
  const { reportId } = req.params;
  
  db.get('SELECT rr.*, r.name as resource_name FROM resource_reports rr LEFT JOIN resources r ON rr.resource_id = r.id WHERE rr.id = ?', [reportId], (err, report) => {
    if (err || !report) return res.status(404).json({ error: 'Report not found' });

    // Tworzymy szablon w locie, jeśli nie istnieje na dysku
    const templatePath = path.join(__dirname, '../templates/report_template.xlsx');
    
    // Jeśli nie mamy fizycznego pliku, generujemy prosty XLSX
    const wb = xlsx.utils.book_new();
    const wsData = [
      ['ERCC ENGINE ROOM REPORT SYSTEM', ''],
      ['Report ID', report.id],
      ['Report Type', report.report_type],
      ['Resource', report.resource_name || 'N/A'],
      ['', ''],
      ['DATA INPUT SECTION', 'VALUE'],
      ['Current Level', ''],
      ['Temperature', ''],
      ['Density', ''],
      ['Notes', '']
    ];
    
    const ws = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, 'Report');
    
    // Wysyłamy plik bezpośrednio do przeglądarki
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename=ERCC_Template_${report.report_type}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  });
});

// ===== 2. UPLOAD I PARSOWANIE EXCELA =====
router.post('/:reportId/upload', authMiddleware, upload.single('report_file'), (req, res) => {
  const { reportId } = req.params;
  const filePath = req.file.path;

  try {
    // Czytamy plik Excel
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // Wyciągamy dane (szukamy kluczy w kolumnie A i wartości w B)
    const extractedData = {};
    data.forEach(row => {
      if (row[0] === 'Current Level') extractedData.current_level = row[1];
      if (row[0] === 'Temperature') extractedData.temp = row[1];
      if (row[0] === 'Density') extractedData.density = row[1];
      if (row[0] === 'Notes') extractedData.notes = row[1];
    });

    // Aktualizujemy status raportu w bazie
    db.run(
      `UPDATE resource_reports 
       SET status = 'submitted', 
           submitted_by = ?, 
           submitted_at = CURRENT_TIMESTAMP, 
           submission_notes = ?,
           readings = ?
       WHERE id = ?`,
      [req.user.id, extractedData.notes || 'Uploaded via Excel', JSON.stringify(extractedData), reportId],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });

        res.json({ 
          success: true, 
          message: 'Excel parsed and submitted',
          data: extractedData
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse Excel file: ' + err.message });
  }
});

// ===== 3. WSZYSTKIE RAPORTY (Dla Chiefa) =====
router.get('/all', authMiddleware, chiefMiddleware, (req, res) => {
  db.all(`
    SELECT rr.*, 
           u_assigned.name as assigned_to_name,
           u_by.name as assigned_by_name,
           r.name as resource_name,
           CASE 
             WHEN rr.status = 'pending' AND rr.due_date < DATE('now') THEN 'overdue'
             ELSE rr.status 
           END as actual_status
    FROM resource_reports rr
    LEFT JOIN users u_assigned ON rr.assigned_to = u_assigned.id
    LEFT JOIN users u_by ON rr.assigned_by = u_by.id
    LEFT JOIN resources r ON rr.resource_id = r.id
    ORDER BY rr.due_date DESC
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// ===== 4. WERYFIKACJA (Chief zatwierdza dane z Excela) =====
router.put('/:reportId/verify', authMiddleware, chiefMiddleware, (req, res) => {
  const { reportId } = req.params;
  const { verified, verification_notes } = req.body;

  db.get('SELECT * FROM resource_reports WHERE id = ?', [reportId], (err, report) => {
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const status = verified ? 'verified' : 'rejected';

    db.run(
      `UPDATE resource_reports 
       SET status = ?, verified_by = ?, verified_at = CURRENT_TIMESTAMP, verification_notes = ?
       WHERE id = ?`,
      [status, req.user.id, verification_notes, reportId],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });

        // JEŚLI ZATWIERDZONO -> AKTUALIZUJEMY GŁÓWNĄ INWENTARYZACJĘ I TRENDY!
        if (verified && report.readings) {
          const readings = JSON.parse(report.readings);
          const newLevel = parseFloat(readings.current_level);

          if (!isNaN(newLevel)) {
            // 1. Aktualizacja resources
            db.run('UPDATE resources SET current_level = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?', 
              [newLevel, report.resource_id]);

            // 2. Dodanie do historii trendów
            db.run(`
              INSERT INTO inventory_history (resource_id, level_before, level_after, recorded_by, change_reason)
              VALUES (?, ?, ?, ?, ?)`,
              [report.resource_id, 0, newLevel, report.submitted_by, 'Monthly Excel Report']
            );
          }
        }

        res.json({ success: true, status });
      }
    );
  });
});

module.exports = router;
