const db = require('./db');

console.log('⏰ Seeding Professional Watch System (v2)...\n');

db.serialize(() => {
  // 1. Insert Watch Schedule
  db.run(
    `INSERT INTO watch_schedules (schedule_name, vessel_condition, morning_start, morning_end, lunch_start, lunch_end, rest_start, rest_end, night_start, night_end)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Standard Sea Rotation', 'at_sea', '07:30', '12:00', '12:00', '13:00', '16:00', '22:00', '22:00', '07:30']
  );

  // 2. Insert Watch Phases
  const phases = [
    ['breakfast', 'Breakfast', '06:30', '08:00', 'Both', 'Meal Time'],
    ['morning_work', 'Morning Maintenance', '08:00', '10:00', 'Mechanic', 'Normal Working Day'],
    ['coffee_1', 'Morning Coffee', '10:00', '10:30', 'Both', '30 min Break'],
    ['noon_work', 'Maintenance & Noon Log', '10:30', '12:00', 'Mechanic', 'Logs Parameters'],
    ['lunch', 'Lunch', '12:00', '13:00', 'Both', 'Meal Time'],
    ['afternoon_work', 'Afternoon Maintenance', '13:00', '15:00', 'Mechanic', 'Normal Working Day'],
    ['coffee_2', 'Afternoon Coffee', '15:00', '15:30', 'Both', '30 min Break'],
    ['end_work', 'End Day Maintenance', '15:30', '17:00', 'Mechanic', 'Cleaning'],
    ['evening_rest', 'Evening Rest', '17:00', '22:00', 'Both', 'Dinner at 18:00'],
    ['night_ums', 'Night Watch (UMS)', '22:00', '06:30', 'Mechanic', 'Alarms on Cabin']
  ];

  const stmt = db.prepare(`INSERT INTO watch_phases (phase_code, phase_name, start_time, end_time, responsible_role, description) VALUES (?, ?, ?, ?, ?, ?)`);
  phases.forEach(p => stmt.run(p));
  stmt.finalize();

  // 3. Create dummy assignment for today
  // Get some user IDs first
  db.all("SELECT id FROM users WHERE role = 'mechanic' LIMIT 3", (err, mechs) => {
    if (mechs && mechs.length >= 1) {
      const m1 = mechs[0].id;
      const m2 = mechs[1]?.id || m1;
      const m3 = mechs[2]?.id || m1;
      
      db.run(`
        INSERT OR REPLACE INTO daily_watch_assignment_v2 
        (watch_date, morning_mechanic_id, afternoon_mechanic_id, night_mechanic_id)
        VALUES (DATE('now'), ?, ?, ?)
      `, [m1, m2, m3]);
    }
  });

  console.log('✅ Seeding complete!');
});
