const db = require('./db');
const bcrypt = require('bcryptjs');

console.log('🌱 Seeding ERCC Database with comprehensive test data...\n');

// ===== USERS =====
const users = [
  {
    name: 'jose.santos',
    password: 'pass123',
    role: 'chief_engineer',
    crew_number: 'CE-001',
    email: 'jose.santos@ship.com',
    phone: '+34691234567',
    certifications: 'STCW, ECDIS, Diesel Engine Specialist'
  },
  {
    name: 'john.smith',
    password: 'pass123',
    role: 'mechanic',
    crew_number: 'ME-001',
    email: 'john.smith@ship.com',
    phone: '+44712345678',
    certifications: 'STCW, Diesel Engine Maintenance'
  },
  {
    name: 'lars.hansen',
    password: 'pass123',
    role: 'mechanic',
    crew_number: 'ME-002',
    email: 'lars.hansen@ship.com',
    phone: '+45401234567',
    certifications: 'STCW, Hydraulics, Auxiliary Systems'
  },
  {
    name: 'maria.rodriguez',
    password: 'pass123',
    role: 'mechanic',
    crew_number: 'ME-003',
    email: 'maria.rodriguez@ship.com',
    phone: '+34691234568',
    certifications: 'STCW, Electrical Systems, PLC'
  },
  {
    name: 'kwang.lee',
    password: 'pass123',
    role: 'mechanic',
    crew_number: 'ME-004',
    email: 'kwang.lee@ship.com',
    phone: '+6562345678',
    certifications: 'STCW, Cooling Systems, Water Treatment'
  }
];

// Clear old data
db.serialize(() => {
  db.run('DELETE FROM crew_manifest');
  db.run('DELETE FROM maintenance_schedule');
  db.run('DELETE FROM system_alerts');
  db.run('DELETE FROM audit_logs');
  db.run('DELETE FROM messages');
  db.run('DELETE FROM task_approvals');
  db.run('DELETE FROM tasks');
  db.run('DELETE FROM task_templates');
  db.run('DELETE FROM resource_reports');
  db.run('DELETE FROM resources');
  db.run('DELETE FROM sectors');
  db.run('DELETE FROM folders');
  db.run('DELETE FROM users');

  // Insert Users
  let userIds = {};
  users.forEach((user) => {
    const passwordHash = bcrypt.hashSync(user.password, 10);
    
    db.run(
      `INSERT INTO users (name, password_hash, role, email, phone, crew_number, certifications, join_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, DATE('now'))`,
      [user.name, passwordHash, user.role, user.email, user.phone, user.crew_number, user.certifications],
      function(err) {
        if (err) {
          console.error(`❌ Error inserting ${user.name}:`, err);
        } else {
          userIds[user.name] = this.lastID;
          console.log(`✅ User created: ${user.name} (${user.role})`);
        }
      }
    );
  });

// ===== SECTORS =====
setTimeout(() => {
  const sectors = [
    {
      name: 'Main Engine Room',
      description: 'Primary diesel engine and main propulsion systems',
      equipment: 'MAN B&W 6S60ME, Turbocharger, Fuel Treatment',
      criticality: 'critical'
    },
    {
      name: 'Auxiliary Engine Room',
      description: 'Diesel generators for electrical power',
      equipment: '2x Caterpillar CAT 3516 Gensets',
      criticality: 'critical'
    },
    {
      name: 'Boiler Deck',
      description: 'Steam boiler and exhaust gas treatment',
      equipment: 'Waste Heat Boiler, Economizer',
      criticality: 'high'
    },
    {
      name: 'Purifier Room',
      description: 'Fuel and lube oil purification and storage',
      equipment: 'Centrifugal Purifiers, Storage Tanks, Heaters',
      criticality: 'high'
    },
    {
      name: 'Cooling System',
      description: 'Seawater and freshwater cooling circuits',
      equipment: 'Heat Exchangers, Pumps, Filters',
      criticality: 'high'
    },
    {
      name: 'Electrical Distribution',
      description: 'Power distribution, switchboards, batteries',
      equipment: 'Main Switchboard, UPS Systems, Battery Banks',
      criticality: 'critical'
    }
  ];

  sectors.forEach((sector, idx) => {
    const responsibleId = [userIds['john.smith'], userIds['lars.hansen'], userIds['maria.rodriguez'], userIds['kwang.lee']][idx % 4];
    
    db.run(
      `INSERT INTO sectors (name, description, equipment, criticality, responsible_engineer_id, status)
       VALUES (?, ?, ?, ?, ?, 'operational')`,
      [sector.name, sector.description, sector.equipment, sector.criticality, responsibleId],
      (err) => {
        if (err) console.error(`❌ Error creating sector ${sector.name}:`, err);
        else console.log(`✅ Sector created: ${sector.name}`);
      }
    );
  });

  // ===== ASSIGN USERS TO SECTORS =====
  setTimeout(() => {
    db.get('SELECT id FROM sectors WHERE name = ?', ['Main Engine Room'], (err, sector) => {
      if (sector) {
        db.run('UPDATE users SET sector_assignment = ? WHERE name = ?', [sector.id, 'john.smith']);
      }
    });

    db.get('SELECT id FROM sectors WHERE name = ?', ['Auxiliary Engine Room'], (err, sector) => {
      if (sector) {
        db.run('UPDATE users SET sector_assignment = ? WHERE name = ?', [sector.id, 'lars.hansen']);
      }
    });

    db.get('SELECT id FROM sectors WHERE name = ?', ['Purifier Room'], (err, sector) => {
      if (sector) {
        db.run('UPDATE users SET sector_assignment = ? WHERE name = ?', [sector.id, 'maria.rodriguez']);
      }
    });

    db.get('SELECT id FROM sectors WHERE name = ?', ['Cooling System'], (err, sector) => {
      if (sector) {
        db.run('UPDATE users SET sector_assignment = ? WHERE name = ?', [sector.id, 'kwang.lee']);
      }
    });
  }, 500);

  // ===== RESOURCES =====
  const resources = [
    { type: 'HFO', level: 87, capacity: 1000 },
    { type: 'MDO', level: 92, capacity: 300 },
    { type: 'Lube_Oil', level: 78, capacity: 150 },
    { type: 'Cooling_Water', level: 85, capacity: 500 },
    { type: 'Battery', level: 95, capacity: 100 }
  ];

  resources.forEach(res => {
    const status = res.level < 25 ? 'critical' : res.level < 40 ? 'warning' : res.level > 90 ? 'optimal' : 'normal';
    
    db.run(
      `INSERT INTO resources (resource_type, current_level, max_capacity, status, reported_by, last_verified)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [res.type, res.level, res.capacity, status, userIds['jose.santos']],
      (err) => {
        if (err) console.error(`❌ Error creating resource ${res.type}:`, err);
        else console.log(`✅ Resource created: ${res.type} (${res.level}%)`);
      }
    );
  });

  // ===== TASKS =====
  setTimeout(() => {
    db.all('SELECT id, name FROM sectors LIMIT 4', (err, sectors) => {
      if (!sectors) return;

      const tasks = [
        {
          title: 'Main Engine Oil Change',
          description: 'Change main engine lube oil and replace filters according to schedule',
          assigned_to: userIds['john.smith'],
          sector_id: sectors[0]?.id,
          priority: 'high',
          estimated_hours: 4
        },
        {
          title: 'Generator Maintenance Check',
          description: 'Perform routine maintenance on auxiliary generators (cooling, fuel filters)',
          assigned_to: userIds['lars.hansen'],
          sector_id: sectors[1]?.id,
          priority: 'medium',
          estimated_hours: 3
        },
        {
          title: 'Fuel Purifier Service',
          description: 'Clean and service centrifugal fuel purifiers',
          assigned_to: userIds['maria.rodriguez'],
          sector_id: sectors[3]?.id,
          priority: 'high',
          estimated_hours: 2
        },
        {
          title: 'Cooling System Flush',
          description: 'Flush freshwater cooling circuit and check heat exchanger',
          assigned_to: userIds['kwang.lee'],
          sector_id: sectors[4]?.id,
          priority: 'medium',
          estimated_hours: 5
        },
        {
          title: 'Electrical Panel Inspection',
          description: 'Inspect switchboard, check connections and test emergency systems',
          assigned_to: userIds['maria.rodriguez'],
          sector_id: sectors[5]?.id,
          priority: 'critical',
          estimated_hours: 2
        }
      ];

      tasks.forEach((task, idx) => {
        db.run(
          `INSERT INTO tasks (title, description, assigned_to, created_by, status, priority, 
                             sector_id, estimated_hours, due_date, approval_status, assigned_at)
           VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, DATE('now', '+3 days'), 'pending', CURRENT_TIMESTAMP)`,
          [task.title, task.description, task.assigned_to, userIds['jose.santos'], 
           task.priority, task.sector_id, task.estimated_hours],
          (err) => {
            if (err) console.error(`❌ Error creating task:`, err);
            else console.log(`✅ Task created: ${task.title}`);
          }
        );
      });
    });
  }, 1000);

  // ===== CREW MANIFEST =====
  setTimeout(() => {
    db.run(
      `INSERT INTO crew_manifest (ship_name, imo_number, call_sign, total_crew, engine_room_crew, chief_engineer_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['MV Nordic Star', '9876543', 'CBPQ', 23, 5, userIds['jose.santos']],
      (err) => {
        if (err) console.error('❌ Error creating crew manifest:', err);
        else console.log('✅ Crew manifest created');
      }
    );
  }, 1500);

  // ===== INITIAL ALERTS =====
  setTimeout(() => {
    db.run(
      `INSERT INTO system_alerts (alert_type, severity, message, related_resource_type)
       VALUES (?, ?, ?, ?)`,
      ['manual_alert', 'info', 'System initialization complete. All modules operational.', null],
      (err) => {
        if (err) console.error('❌ Error creating welcome alert:', err);
        else console.log('✅ Welcome alert created');
      }
    );
  }, 2000);

}, 500);

console.log('\n⏳ Seeding in progress...');
console.log('This may take 2-3 seconds. Please wait...\n');

  setTimeout(() => {
    console.log('🎉 Seeding completed!\n');
    console.log('📋 Test Credentials:');
    console.log('   Chief Engineer: jose.santos / pass123');
    console.log('   Mechanic 1:     john.smith / pass123');
    console.log('   Mechanic 2:     lars.hansen / pass123');
    console.log('   Mechanic 3:     maria.rodriguez / pass123');
    console.log('   Mechanic 4:     kwang.lee / pass123\n');
    process.exit(0);
  }, 3000);
});
