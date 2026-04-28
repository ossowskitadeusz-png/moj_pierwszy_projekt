const db = require('./db');

console.log('🚢 Seeding Watch Rotation System (Attempt 5)...');

db.serialize(() => {
  // 1. Dodaj Daymanów
  db.run(`INSERT OR IGNORE INTO users (name, password_hash, role) VALUES ('Oiler 1', 'pass123', 'dayman')`);
  db.run(`INSERT OR IGNORE INTO users (name, password_hash, role) VALUES ('Oiler 2', 'pass123', 'dayman')`);
  db.run(`INSERT OR IGNORE INTO users (name, password_hash, role) VALUES ('Wiper', 'pass123', 'dayman')`, () => {
    
    // 2. Pobierz użytkowników i przypisz wachty (W ŚRODKU CALLBACKA)
    db.all(`SELECT id, name FROM users WHERE role IN ('mechanic', 'dayman', 'chief_engineer')`, (err, users) => {
      if (err) return console.error(err);
      
      const m1 = users.find(u => u.name === 'john.smith');
      const m2 = users.find(u => u.name === 'lars.hansen');
      const m3 = users.find(u => u.name === 'maria.rodriguez');
      const d1 = users.find(u => u.name === 'Oiler 1');
      const d2 = users.find(u => u.name === 'Oiler 2');
      const d3 = users.find(u => u.name === 'Wiper');

      if (!m1 || !d1) {
        console.log('Users found:', users.map(u => u.name).join(', '));
        console.error('❌ Could not find users for Watch 1.');
        return;
      }

      db.run(`INSERT INTO mechanic_assignments (mechanic_id, dayman_id, watch_position, start_date) VALUES (?, ?, 1, DATE('now'))`, [m1.id, d1.id]);
      if (m2 && d2) db.run(`INSERT INTO mechanic_assignments (mechanic_id, dayman_id, watch_position, start_date) VALUES (?, ?, 2, DATE('now'))`, [m2.id, d2.id]);
      if (m3 && d3) db.run(`INSERT INTO mechanic_assignments (mechanic_id, dayman_id, watch_position, start_date) VALUES (?, ?, 3, DATE('now'))`, [m3.id, d3.id]);

      db.run(`INSERT OR REPLACE INTO daily_watch_assignment (watch_date, morning_mechanic_id, morning_dayman_id, ums_mechanic_id)
              VALUES (DATE('now'), ?, ?, ?)`, [m1.id, d1.id, m1.id]);

      console.log('✅ Watch Rotation Seeded successfully.');
    });
  });

  // 3. Checklisty
  db.run(`INSERT OR IGNORE INTO watch_checklists (type, title, responsible_role) VALUES ('morning', 'Morning Watch Checklist', 'Dayman')`);
  db.run(`INSERT OR IGNORE INTO watch_checklists (type, title, responsible_role) VALUES ('noon', 'Noon Watch Checklist', 'Dayman')`, () => {
    db.all(`SELECT id, type FROM watch_checklists`, (err, checklists) => {
      checklists.forEach(cl => {
        db.run(`INSERT INTO checklist_items (checklist_id, item_order, title) VALUES (?, 1, 'Check Bilges')`, [cl.id]);
        db.run(`INSERT INTO checklist_items (checklist_id, item_order, title) VALUES (?, 2, 'Check Oil Leaks')`, [cl.id]);
      });
    });
  });
});
