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
  db.run('DELETE FROM fuel_soundings');
  db.run('DELETE FROM inventory_history');
  db.run('DELETE FROM resource_assignments');
  db.run('DELETE FROM resource_reports');
  db.run('DELETE FROM resources');
  db.run('DELETE FROM tank_definitions');
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

  // ===== RESOURCES (14 typów zasobów) =====
  console.log('\n⛽ Seeding Resources & Tanks...\n');

  const resourcesData = [
    // FUEL
    { name: 'Heavy Fuel Oil (HFO)', type: 'HFO', category: 'fuel', unit: 'MT', current: 750, capacity: 900, critical: 150, warning: 300, supplier: 'Shell Marine', location: 'Tank Deck' },
    { name: 'Marine Diesel Oil (MDO)', type: 'MDO', category: 'fuel', unit: 'MT', current: 85, capacity: 100, critical: 20, warning: 40, supplier: 'Shell Marine', location: 'Engine Room' },
    { name: 'Marine Gas Oil (MGO)', type: 'MGO', category: 'fuel', unit: 'MT', current: 20, capacity: 25, critical: 5, warning: 10, supplier: 'Port Bunker Station', location: 'Engine Room' },

    // LUBE OILS
    { name: 'Main Engine Lube Oil SAE 40', type: 'Lube_Oil', category: 'lube_oil', unit: 'Liters', current: 28000, capacity: 30000, critical: 5000, warning: 10000, supplier: 'Total Lubricants', location: 'Engine Room' },
    { name: 'Generator Lube Oil SAE 40', type: 'Lube_Oil', category: 'lube_oil', unit: 'Liters', current: 18000, capacity: 20000, critical: 3000, warning: 8000, supplier: 'Mobil Oil', location: 'Aux Engine Room' },
    { name: 'Hydraulic Oil ISO 46', type: 'Hydraulic', category: 'hydraulic', unit: 'Liters', current: 13500, capacity: 15000, critical: 2000, warning: 5000, supplier: 'BP Hydraulics', location: 'Pump Room' },

    // WATER TREATMENT
    { name: 'Cooling Water Treatment Chemical', type: 'Chemicals', category: 'water_treatment', unit: 'Liters', current: 18, capacity: 20, critical: 2, warning: 5, supplier: 'Chemlab Marine', location: 'Engine Room' },
    { name: 'Boiler Water Treatment', type: 'Chemicals', category: 'water_treatment', unit: 'Liters', current: 8, capacity: 10, critical: 1, warning: 3, supplier: 'Nalco', location: 'Boiler Deck' },

    // GAS BOTTLES
    { name: 'Oxygen (O2) Bottles', type: 'Gas_Bottles', category: 'gas_bottles', unit: 'Units', current: 5, capacity: 6, critical: 0, warning: 1, supplier: 'Local Gas Supplier', location: 'Workshops' },
    { name: 'Nitrogen (N2) Bottles', type: 'Gas_Bottles', category: 'gas_bottles', unit: 'Units', current: 3, capacity: 4, critical: 0, warning: 1, supplier: 'Local Gas Supplier', location: 'Workshops' },
    { name: 'Acetylene Bottles', type: 'Gas_Bottles', category: 'gas_bottles', unit: 'Units', current: 1, capacity: 2, critical: 0, warning: 1, supplier: 'Local Gas Supplier', location: 'Workshops' },

    // CHEMICALS
    { name: 'Rust Preventive Oil', type: 'Chemicals', category: 'chemicals', unit: 'Liters', current: 9, capacity: 10, critical: 1, warning: 3, supplier: 'Tectyl Marine', location: 'Engine Room' },
    { name: 'Degreaser/Cleaner', type: 'Chemicals', category: 'chemicals', unit: 'Liters', current: 7, capacity: 8, critical: 0.5, warning: 2, supplier: 'Chemlab Marine', location: 'Workshops' },
    { name: 'Engine Room Disinfectant', type: 'Chemicals', category: 'chemicals', unit: 'Liters', current: 4, capacity: 5, critical: 0.5, warning: 1.5, supplier: 'Chemlab Marine', location: 'Engine Room' }
  ];

  resourcesData.forEach(resource => {
    const status = resource.current > (resource.capacity * 0.8) ? 'optimal' :
                   resource.current > (resource.capacity * 0.5) ? 'normal' :
                   resource.current > resource.critical ? 'warning' : 'critical';

    db.run(
      `INSERT INTO resources 
       (name, resource_type, category, current_level, max_capacity, unit, status, critical_threshold, warning_threshold, supplier, location, reported_by, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [resource.name, resource.type, resource.category, resource.current, resource.capacity, resource.unit,
       status, resource.critical, resource.warning, resource.supplier, resource.location, userIds['jose.santos']],
      (err) => {
        if (err) console.error(`❌ Error creating resource: ${resource.name}`, err);
        else console.log(`✅ Resource created: ${resource.name} (${resource.current}/${resource.capacity} ${resource.unit})`);
      }
    );
  });

  // ===== TANK DEFINITIONS (11 zbiorników) =====
  const tankDefinitions = [
    { name: 'HFO Tank No.1 Port', code: 'HFO-P1', type: 'HFO', capacity_cbm: 400, location: 'Port Side, Tank Deck' },
    { name: 'HFO Tank No.1 Starboard', code: 'HFO-S1', type: 'HFO', capacity_cbm: 400, location: 'Starboard Side, Tank Deck' },
    { name: 'HFO Settling Tank', code: 'HFO-ST', type: 'HFO', capacity_cbm: 50, location: 'Engine Room' },
    { name: 'HFO Service Tank', code: 'HFO-SV', type: 'HFO', capacity_cbm: 30, location: 'Engine Room' },
    { name: 'MDO Daily Tank', code: 'MDO-DT', type: 'MDO', capacity_cbm: 50, location: 'Engine Room' },
    { name: 'MDO Reserve Tank', code: 'MDO-RT', type: 'MDO', capacity_cbm: 40, location: 'Tank Deck' },
    { name: 'MGO Service Tank', code: 'MGO-SV', type: 'MGO', capacity_cbm: 25, location: 'Engine Room' },
    { name: 'Main Engine Lube Oil Tank', code: 'LUBE-ME', type: 'Lube_Oil', capacity_cbm: 30, location: 'Engine Room' },
    { name: 'Generator Lube Oil Tank', code: 'LUBE-GEN', type: 'Lube_Oil', capacity_cbm: 20, location: 'Aux Engine Room' },
    { name: 'Hydraulic Oil Tank', code: 'HYD-01', type: 'Hydraulic', capacity_cbm: 15, location: 'Pump Room' },
    { name: 'Fresh Water Cooling Tank', code: 'COOL-FW', type: 'Cooling_Water', capacity_cbm: 40, location: 'Engine Room' }
  ];

  tankDefinitions.forEach(tank => {
    db.run(
      `INSERT INTO tank_definitions (tank_name, tank_code, resource_type, capacity_cbm, capacity_liters, location, density_default)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tank.name, tank.code, tank.type, tank.capacity_cbm, tank.capacity_cbm * 1000, tank.location, 890],
      (err) => {
        if (err) console.error(`❌ Error creating tank: ${tank.name}`, err);
        else console.log(`✅ Tank created: ${tank.name}`);
      }
    );
  });

  // ===== TASKS =====
  setTimeout(() => {
    db.all('SELECT id, name FROM sectors LIMIT 6', (err, sectors) => {
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

      tasks.forEach(task => {
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

  // ===== RESOURCE ASSIGNMENTS (Chief przydzielił raporty mechanikom) =====
  setTimeout(() => {
    console.log('\n📋 Creating resource assignments...\n');

    const assignments = [
      { crew: 'john.smith', reportType: 'fuel_sounding', resourceName: 'Heavy Fuel Oil (HFO)', frequency: 'weekly' },
      { crew: 'lars.hansen', reportType: 'lube_oil_check', resourceName: 'Main Engine Lube Oil SAE 40', frequency: 'monthly' },
      { crew: 'maria.rodriguez', reportType: 'hydraulic_check', resourceName: 'Hydraulic Oil ISO 46', frequency: 'monthly' },
      { crew: 'kwang.lee', reportType: 'water_treatment_check', resourceName: 'Cooling Water Treatment Chemical', frequency: 'monthly' },
      { crew: 'john.smith', reportType: 'gas_bottles_count', resourceName: 'Oxygen (O2) Bottles', frequency: 'monthly' },
      { crew: 'maria.rodriguez', reportType: 'chemicals_stock', resourceName: 'Rust Preventive Oil', frequency: 'monthly' }
    ];

    assignments.forEach(assign => {
      db.get(
        'SELECT id FROM resources WHERE name = ?',
        [assign.resourceName],
        (err, resource) => {
          if (resource) {
            // Create the assignment
            db.run(
              `INSERT INTO resource_assignments (crew_member_id, report_type, resource_id, frequency, assigned_by, start_date, status)
               VALUES (?, ?, ?, ?, ?, DATE('now'), 'active')`,
              [userIds[assign.crew], assign.reportType, resource.id, assign.frequency, userIds['jose.santos']],
              (err) => {
                if (err) console.error(`❌ Error creating assignment:`, err);
                else console.log(`✅ Assignment: ${assign.reportType} → ${assign.crew}`);
              }
            );

            // Create a pending report for this assignment
            db.run(
              `INSERT INTO resource_reports (report_type, resource_id, assigned_to, assigned_by, due_date, status)
               VALUES (?, ?, ?, ?, DATE('now', '+7 days'), 'pending')`,
              [assign.reportType, resource.id, userIds[assign.crew], userIds['jose.santos']],
              (err) => {
                if (err) console.error(`❌ Error creating pending report:`, err);
                else console.log(`✅ Pending report created for ${assign.crew}: ${assign.reportType}`);
              }
            );
          }
        }
      );
    });
  }, 2000);

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
  }, 2500);

}, 500);

console.log('\n⏳ Seeding in progress...');
console.log('This may take 3-4 seconds. Please wait...\n');

  setTimeout(() => {
    console.log('\n🎉 Seeding completed!\n');
    console.log('📋 Test Credentials:');
    console.log('   Chief Engineer: jose.santos / pass123');
    console.log('   Mechanic 1:     john.smith / pass123');
    console.log('   Mechanic 2:     lars.hansen / pass123');
    console.log('   Mechanic 3:     maria.rodriguez / pass123');
    console.log('   Mechanic 4:     kwang.lee / pass123\n');
    console.log('⛽ Resources: 14 types, 11 tanks, 6 assignments created');
    process.exit(0);
  }, 4000);
});
