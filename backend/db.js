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
      role TEXT DEFAULT 'mechanic' CHECK(role IN ('mechanic', 'chief_engineer', 'admin', 'dayman')),
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

  // ===== RESOURCES (Rozbudowana - Fuel, Oil, Chemicals, Gas, etc.) =====
  db.run(`
    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      resource_type TEXT CHECK(resource_type IN ('HFO', 'MDO', 'MGO', 'Lube_Oil', 'Hydraulic', 'Cooling_Water', 'Battery', 'Chemicals', 'Gas_Bottles')),
      category TEXT CHECK(category IN ('fuel', 'lube_oil', 'hydraulic', 'water_treatment', 'gas_bottles', 'chemicals')),
      current_level REAL NOT NULL,
      max_capacity REAL NOT NULL,
      unit TEXT DEFAULT 'Liters' CHECK(unit IN ('Liters', 'MT', 'Units', 'Bottles', '%')),
      status TEXT DEFAULT 'normal' CHECK(status IN ('critical', 'warning', 'normal', 'optimal')),
      critical_threshold REAL DEFAULT 20,
      warning_threshold REAL DEFAULT 40,
      reorder_point REAL,
      location TEXT,
      supplier TEXT,
      last_updated DATETIME,
      last_verified DATETIME,
      reported_by INTEGER,
      is_critical INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(reported_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('❌ Error creating resources table:', err);
    else console.log('✅ Resources table created');
  });

  // ===== RESOURCE REPORTS (Rozbudowana - Formularz raportowania) =====
  db.run(`
    CREATE TABLE IF NOT EXISTS resource_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_type TEXT NOT NULL CHECK(report_type IN ('fuel_sounding', 'lube_oil_check', 'hydraulic_check', 'water_treatment_check', 'gas_bottles_count', 'chemicals_stock')),
      resource_id INTEGER NOT NULL,
      assigned_to INTEGER NOT NULL,
      assigned_by INTEGER NOT NULL,
      due_date DATE NOT NULL,
      submitted_date DATETIME,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'submitted', 'verified', 'overdue', 'rejected')),
      submission_notes TEXT,
      submitted_by INTEGER,
      verified_by INTEGER,
      verification_notes TEXT,
      verified_at DATETIME,
      readings TEXT,
      photos_json TEXT,
      acknowledged_by_chief INTEGER,
      acknowledged_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE,
      FOREIGN KEY(assigned_to) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(assigned_by) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(submitted_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(verified_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(acknowledged_by_chief) REFERENCES users(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('❌ Error creating resource_reports table:', err);
    else console.log('✅ Resource Reports table created');
  });

  // ===== TANK DEFINITIONS (Konkretne zbiorniki na statku) =====
  db.run(`
    CREATE TABLE IF NOT EXISTS tank_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tank_name TEXT UNIQUE NOT NULL,
      tank_code TEXT UNIQUE,
      resource_type TEXT CHECK(resource_type IN ('HFO', 'MDO', 'MGO', 'Lube_Oil', 'Hydraulic', 'Cooling_Water')),
      capacity_cbm REAL,
      capacity_liters REAL,
      location TEXT,
      sounding_table_ref TEXT,
      density_default REAL DEFAULT 890,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('❌ Error creating tank_definitions table:', err);
    else console.log('✅ Tank Definitions table created');
  });

  // ===== FUEL SOUNDINGS (Szczegółowe sondowania per zbiornik) =====
  db.run(`
    CREATE TABLE IF NOT EXISTS fuel_soundings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      tank_id INTEGER NOT NULL,
      sounding_mm REAL NOT NULL,
      density_kg_cbm REAL DEFAULT 890,
      temperature_celsius REAL,
      calculated_mt REAL,
      remarks TEXT,
      photo_url TEXT,
      reported_by INTEGER NOT NULL,
      reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(report_id) REFERENCES resource_reports(id) ON DELETE CASCADE,
      FOREIGN KEY(tank_id) REFERENCES tank_definitions(id) ON DELETE CASCADE,
      FOREIGN KEY(reported_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('❌ Error creating fuel_soundings table:', err);
    else console.log('✅ Fuel Soundings table created');
  });

  // ===== INVENTORY HISTORY (Trendy zużycia zasobów) =====
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id INTEGER NOT NULL,
      level_before REAL,
      level_after REAL,
      change_amount REAL,
      change_reason TEXT CHECK(change_reason IN ('consumption', 'refill', 'report_submitted', 'adjustment', 'inventory_check')),
      consumption_rate_per_day REAL,
      days_until_critical INTEGER,
      recorded_by INTEGER,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE,
      FOREIGN KEY(recorded_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('❌ Error creating inventory_history table:', err);
    else console.log('✅ Inventory History table created');
  });

  // ===== RESOURCE ASSIGNMENTS (Przydzielanie raportów crew) =====
  db.run(`
    CREATE TABLE IF NOT EXISTS resource_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crew_member_id INTEGER NOT NULL,
      report_type TEXT NOT NULL,
      resource_id INTEGER,
      frequency TEXT DEFAULT 'monthly' CHECK(frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually', 'as_needed')),
      assigned_by INTEGER NOT NULL,
      assigned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      start_date DATE,
      end_date DATE,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'cancelled')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(crew_member_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(assigned_by) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) console.error('❌ Error creating resource_assignments table:', err);
    else console.log('✅ Resource Assignments table created');
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

  // ===== [TIER 1] WATCH PHASES & SCHEDULES =====
  db.run(`
    CREATE TABLE IF NOT EXISTS watch_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_name TEXT NOT NULL,
      vessel_condition TEXT CHECK(vessel_condition IN ('at_sea', 'in_port', 'anchorage', 'emergency')),
      morning_start TIME,
      morning_end TIME,
      lunch_start TIME,
      lunch_end TIME,
      rest_start TIME,
      rest_end TIME,
      night_start TIME,
      night_end TIME,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('❌ watch_schedules:', err);
    else console.log('✅ Watch Schedules table');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS watch_phases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phase_code TEXT UNIQUE NOT NULL,
      phase_name TEXT NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      responsible_role TEXT,
      vessel_condition TEXT DEFAULT 'at_sea',
      description TEXT
    )
  `, (err) => {
    if (err) console.error('❌ watch_phases:', err);
    else console.log('✅ Watch Phases table');
  });

  // ===== [TIER 1] ALERTS & NOTIFICATIONS =====
  db.run(`
    CREATE TABLE IF NOT EXISTS watch_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_date DATE NOT NULL,
      alert_time TIME,
      mechanic_id INTEGER,
      alert_type TEXT CHECK(alert_type IN ('checklist_due', 'phase_change', 'stcw_warning', 'engine_alarm')),
      severity TEXT DEFAULT 'info',
      acknowledged INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(mechanic_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('❌ watch_alerts:', err);
    else console.log('✅ Watch Alerts table');
  });

  // ===== [TIER 1] ENGINE PARAMETERS (HISTORY & TRENDS) =====
  db.run(`
    CREATE TABLE IF NOT EXISTS engine_parameters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_date DATE NOT NULL,
      log_time TIME NOT NULL,
      mechanic_id INTEGER NOT NULL,
      hfo_tank_level_mt REAL,
      main_engine_temp REAL,
      main_engine_press REAL,
      gen_load REAL,
      recorded_by_role TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(mechanic_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('❌ engine_parameters:', err);
    else console.log('✅ Engine Parameters table');
  });

  // ===== [TIER 1] WATCH HANDOVERS & STCW COMPLIANCE =====
  db.run(`
    CREATE TABLE IF NOT EXISTS watch_handovers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      handover_date DATE NOT NULL,
      from_mechanic_id INTEGER NOT NULL,
      to_mechanic_id INTEGER NOT NULL,
      engine_status TEXT,
      outstanding_issues TEXT,
      handover_acknowledged INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('❌ watch_handovers:', err);
    else console.log('✅ Watch Handovers table');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS stcw_compliance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mechanic_id INTEGER NOT NULL,
      tracking_date DATE NOT NULL,
      rest_hours REAL,
      is_compliant INTEGER DEFAULT 1,
      FOREIGN KEY(mechanic_id) REFERENCES users(id),
      UNIQUE(mechanic_id, tracking_date)
    )
  `, (err) => {
    if (err) console.error('❌ stcw_compliance:', err);
    else console.log('✅ STCW Compliance table');
  });

  // ===== REFACTORED DAILY ASSIGNMENT =====
  db.run(`
    CREATE TABLE IF NOT EXISTS daily_watch_assignment_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      watch_date DATE NOT NULL UNIQUE,
      morning_mechanic_id INTEGER,
      morning_dayman_id INTEGER,
      afternoon_mechanic_id INTEGER,
      afternoon_dayman_id INTEGER,
      night_mechanic_id INTEGER,
      night_dayman_id INTEGER,
      vessel_condition TEXT DEFAULT 'at_sea',
      FOREIGN KEY(morning_mechanic_id) REFERENCES users(id),
      FOREIGN KEY(afternoon_mechanic_id) REFERENCES users(id),
      FOREIGN KEY(night_mechanic_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('❌ daily_watch_assignment_v2:', err);
    else console.log('✅ Refactored Daily Assignment table');
  });

  console.log('\n✅ All Professional TIER 1 tables created!\n');
});

module.exports = db;
