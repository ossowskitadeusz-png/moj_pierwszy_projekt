const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'ercc.db');

// Usunięto kod usuwający starą bazę, aby nie kasowała się przy starcie serwera

const db = new sqlite3.Database(dbPath);
db.run('PRAGMA foreign_keys = ON');

db.serialize(() => {
  console.log('📦 Initializing ERCC Database...\n');

  // ===== USERS (Extended) =====
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'mechanic' CHECK(role IN ('mechanic', 'chief_engineer', 'admin')),
      department TEXT DEFAULT 'engine_room',
      status TEXT DEFAULT 'online' CHECK(status IN ('online', 'offline', 'away', 'on_leave')),
      sector_assignment INTEGER,
      phone TEXT,
      email TEXT,
      crew_number TEXT UNIQUE,
      join_date DATE,
      certifications TEXT,
      notes TEXT,
      last_activity DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(sector_assignment) REFERENCES sectors(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('❌ Error creating users table:', err);
    else console.log('✅ Users table created');
  });

  // ===== SECTORS (Engine Room Zones) =====
  db.run(`
    CREATE TABLE IF NOT EXISTS sectors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      responsible_engineer_id INTEGER,
      equipment TEXT,
      criticality TEXT DEFAULT 'normal' CHECK(criticality IN ('critical', 'high', 'normal', 'low')),
      status TEXT DEFAULT 'operational' CHECK(status IN ('operational', 'maintenance', 'critical', 'standby')),
      max_capacity INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(responsible_engineer_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('❌ Error creating sectors table:', err);
    else console.log('✅ Sectors table created');
  });

  // ===== RESOURCES (Fuel, Oil, Coolant, Battery) =====
  db.run(`
    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_type TEXT UNIQUE NOT NULL CHECK(resource_type IN ('HFO', 'MDO', 'Lube_Oil', 'Cooling_Water', 'Battery')),
      current_level REAL NOT NULL,
      max_capacity REAL NOT NULL,
      unit TEXT DEFAULT '%',
      status TEXT DEFAULT 'normal' CHECK(status IN ('critical', 'warning', 'normal', 'optimal')),
      critical_threshold REAL DEFAULT 20,
      warning_threshold REAL DEFAULT 40,
      last_refill DATE,
      refill_interval INTEGER,
      location TEXT,
      reported_by INTEGER,
      last_verified DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(reported_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('❌ Error creating resources table:', err);
    else console.log('✅ Resources table created');
  });

  // ===== RESOURCE REPORTS (Field Reports) =====
  db.run(`
    CREATE TABLE IF NOT EXISTS resource_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_type TEXT NOT NULL,
      reported_by INTEGER NOT NULL,
      current_level REAL NOT NULL,
      notes TEXT,
      photo_url TEXT,
      verified_by INTEGER,
      verification_time DATETIME,
      acknowledged_by_chief INTEGER,
      acknowledged_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(reported_by) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(verified_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(acknowledged_by_chief) REFERENCES users(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('❌ Error creating resource_reports table:', err);
    else console.log('✅ Resource Reports table created');
  });

  // ===== TASKS (Extended) =====
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      assigned_to INTEGER NOT NULL,
      created_by INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold', 'overdue')),
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
      due_date DATE,
      approval_status TEXT DEFAULT 'pending' CHECK(approval_status IN ('pending', 'approved', 'rejected', 'awaiting_review')),
      sector_id INTEGER,
      resource_type TEXT,
      estimated_hours REAL,
      actual_hours REAL,
      start_date DATETIME,
      completion_date DATETIME,
      completion_notes TEXT,
      assigned_at DATETIME,
      template_id INTEGER,
      recurring INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(assigned_to) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(sector_id) REFERENCES sectors(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('❌ Error creating tasks table:', err);
    else console.log('✅ Tasks table created');
  });

  // ===== TASK APPROVALS (Approval History) =====
  db.run(`
    CREATE TABLE IF NOT EXISTS task_approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      approved_by INTEGER NOT NULL,
      approval_status TEXT CHECK(approval_status IN ('approved', 'rejected', 'needs_modification')),
      comment TEXT,
      requested_changes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY(approved_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ Error creating task_approvals table:', err);
    else console.log('✅ Task Approvals table created');
  });

  // ===== TASK TEMPLATES (Recurring Tasks) =====
  db.run(`
    CREATE TABLE IF NOT EXISTS task_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      sector_id INTEGER,
      priority TEXT DEFAULT 'medium',
      estimated_hours REAL,
      recurrence TEXT CHECK(recurrence IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(sector_id) REFERENCES sectors(id) ON DELETE SET NULL,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ Error creating task_templates table:', err);
    else console.log('✅ Task Templates table created');
  });

  // ===== MESSAGES (Communication) =====
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER,
      sector_id INTEGER,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'direct' CHECK(type IN ('direct', 'sector_broadcast', 'emergency', 'notification')),
      priority TEXT DEFAULT 'normal',
      is_read INTEGER DEFAULT 0,
      read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(to_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(sector_id) REFERENCES sectors(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('❌ Error creating messages table:', err);
    else console.log('✅ Messages table created');
  });

  // ===== FOLDERS =====
  db.run(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      department TEXT NOT NULL,
      owner_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('❌ Error creating folders table:', err);
    else console.log('✅ Folders table created');
  });

  // ===== AUDIT LOGS (All Changes) =====
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id INTEGER,
      old_value TEXT,
      new_value TEXT,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('❌ Error creating audit_logs table:', err);
    else console.log('✅ Audit Logs table created');
  });

  // ===== SYSTEM ALERTS (Critical Notifications) =====
  db.run(`
    CREATE TABLE IF NOT EXISTS system_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_type TEXT NOT NULL CHECK(alert_type IN ('resource_critical', 'task_overdue', 'user_offline', 'system_error', 'manual_alert', 'maintenance_due')),
      severity TEXT DEFAULT 'warning' CHECK(severity IN ('info', 'warning', 'critical')),
      message TEXT NOT NULL,
      related_resource_id INTEGER,
      related_resource_type TEXT,
      related_user_id INTEGER,
      resolved INTEGER DEFAULT 0,
      resolved_by INTEGER,
      resolved_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(resolved_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(related_user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('❌ Error creating system_alerts table:', err);
    else console.log('✅ System Alerts table created');
  });

  // ===== CREW MANIFEST (Ship Crew) =====
  db.run(`
    CREATE TABLE IF NOT EXISTS crew_manifest (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ship_name TEXT,
      imo_number TEXT,
      call_sign TEXT,
      total_crew INTEGER,
      engine_room_crew INTEGER,
      chief_engineer_id INTEGER,
      second_engineer_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(chief_engineer_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(second_engineer_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('❌ Error creating crew_manifest table:', err);
    else console.log('✅ Crew Manifest table created');
  });

  // ===== MAINTENANCE SCHEDULE (Preventive Maintenance) =====
  db.run(`
    CREATE TABLE IF NOT EXISTS maintenance_schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_name TEXT NOT NULL,
      sector_id INTEGER,
      maintenance_type TEXT CHECK(maintenance_type IN ('preventive', 'corrective', 'predictive')),
      last_maintenance DATE,
      next_maintenance DATE,
      interval_hours INTEGER,
      interval_days INTEGER,
      responsible_engineer_id INTEGER,
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'overdue')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(sector_id) REFERENCES sectors(id) ON DELETE SET NULL,
      FOREIGN KEY(responsible_engineer_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('❌ Error creating maintenance_schedule table:', err);
    else console.log('✅ Maintenance Schedule table created');
  });

  console.log('\n✅ All tables created successfully!\n');
});

module.exports = db;
