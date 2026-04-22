const sqlite3 = require('sqlite3').verbose();

// 1. Otwarcie (lub stworzenie) pliku bazy danych
const db = new sqlite3.Database('./dashboard.db');

db.serialize(() => {
    // Tabela 1: Logi Napraw (Stara)
    db.run(`
        CREATE TABLE IF NOT EXISTS maintenance_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            description TEXT,
            technician TEXT
        )
    `);

    // Tabela 2: Audit Logs (Nowa - Security)
    db.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            user TEXT,
            action TEXT,
            target_path TEXT,
            ip_address TEXT
        )
    `);

    console.log("Tabele w bazie danych (maintenance_logs, audit_logs) gotowe.");

    // 3. Dodanie pierwszego, testowego wpisu (z Twojego test_1.html)
    db.run(`
        INSERT INTO maintenance_logs (date, description, technician)
        VALUES ('2024-01-15', 'Wymiana uszczelki pompy (System Init)', 'Jan Kowalski')
    `);

    console.log("✅ Baza danych zainicjalizowana pomyślnie!");
});

db.close();
