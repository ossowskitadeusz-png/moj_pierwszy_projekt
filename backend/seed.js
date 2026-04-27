const db = require('./db');
const bcrypt = require('bcryptjs');

console.log('🌱 Seedowanie bazy danych...\n');

const users = [
  {
    name: 'j.smith',
    password: 'pass123',
    role: 'mechanic',
    email: 'j.smith@company.com',
    phone: '+48123456789'
  },
  {
    name: 'p.johnson',
    password: 'pass123',
    role: 'mechanic',
    email: 'p.johnson@company.com',
    phone: '+48123456790'
  },
  {
    name: 'a.davis',
    password: 'pass123',
    role: 'mechanic',
    email: 'a.davis@company.com',
    phone: '+48123456791'
  },
  {
    name: 'chief',
    password: 'chief123',
    role: 'chief_mechanic',
    email: 'chief@company.com',
    phone: '+48999999999'
  }
];

db.serialize(() => {
  // Czyszczenie starych danych
  db.run('DELETE FROM messages');
  db.run('DELETE FROM task_approvals');
  db.run('DELETE FROM tasks');
  db.run('DELETE FROM folders');
  db.run('DELETE FROM audit_logs');
  db.run('DELETE FROM users', () => {
    console.log('🧹 Baza wyczyszczona.');
  });

  // Wstawianie użytkowników
  users.forEach((user) => {
    const passwordHash = bcrypt.hashSync(user.password, 10);
    db.run(
      `INSERT INTO users (name, password_hash, role, email, phone) 
       VALUES (?, ?, ?, ?, ?)`,
      [user.name, passwordHash, user.role, user.email, user.phone],
      function(err) {
        if (err) {
          console.error(`❌ Błąd: ${user.name}`, err);
        } else {
          console.log(`✅ Dodano: ${user.name} (${user.role})`);
        }
      }
    );
  });

  // Dodajemy zadania po upewnieniu się, że użytkownicy są w bazie
  db.all('SELECT id, name FROM users', (err, rows) => {
    if (err) {
      console.error('❌ Błąd pobierania użytkowników:', err);
      return;
    }
    
    if (rows.length < 4) {
      // Jeśli db.all pobrało dane zanim foreach skończył (mimo serialize, bo foreach nie jest async-aware),
      // to spróbujemy jeszcze raz za chwilę
      setTimeout(() => seedTasks(), 1000);
    } else {
      seedTasks(rows);
    }
  });
});

function seedTasks(dbUsers) {
  if (!dbUsers) {
    db.all('SELECT id, name FROM users', (err, rows) => {
      if (rows && rows.length >= 4) seedTasks(rows);
    });
    return;
  }

  const jan = dbUsers.find(u => u.name === 'j.smith');
  const piotr = dbUsers.find(u => u.name === 'p.johnson');
  const anna = dbUsers.find(u => u.name === 'a.davis');
  const chief = dbUsers.find(u => u.name === 'chief');

  if (!jan || !piotr || !anna || !chief) {
    console.error('❌ Nie znaleziono wszystkich użytkowników w bazie!');
    return;
  }

  const tasks = [
    {
      title: 'Main Engine Overhaul',
      description: 'Perform a complete overhaul of the Main Engine and its auxiliary systems.',
      assigned_to: jan.id,
      created_by: chief.id,
      priority: 'high',
      due_date: '2024-02-15'
    },
    {
      title: 'Lube Oil Renewal',
      description: 'Renew lube oil in the turbocharger lubrication system.',
      assigned_to: piotr.id,
      created_by: chief.id,
      priority: 'medium',
      due_date: '2024-02-10'
    },
    {
      title: 'Temperature Sensors Calibration',
      description: 'Calibrate all PT100 temperature sensors on the Main Engine.',
      assigned_to: anna.id,
      created_by: chief.id,
      priority: 'medium',
      due_date: '2024-02-12'
    }
  ];

  tasks.forEach(task => {
    db.run(
      `INSERT INTO tasks 
       (title, description, assigned_to, created_by, priority, due_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [task.title, task.description, task.assigned_to, task.created_by, task.priority, task.due_date],
      function(err) {
        if (err) console.error('❌ Błąd zadania:', err);
        else console.log(`✅ Zadanie: ${task.title}`);
      }
    );
  });

  console.log('\n🎉 Seedowanie ukończone!\n');
}
