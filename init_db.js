const sqlite3 = require('sqlite3').verbose();

// 1. Otwarcie (lub stworzenie) pliku bazy danych
const db = new sqlite3.Database('./dashboard.db');

db.serialize(() => {
    // 2. Tworzenie tabeli logów (jeśli nie istnieje)
    db.run(`
        CREATE TABLE IF NOT EXISTS maintenance_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            description TEXT NOT NULL,
            technician TEXT NOT NULL
        )
    `);

    // 3. Dodanie pierwszego, testowego wpisu (z Twojego test_1.html)
    db.run(`
        INSERT INTO maintenance_logs (date, description, technician)
        VALUES ('2024-01-15', 'Wymiana uszczelki pompy (System Init)', 'Jan Kowalski')
    `);

    console.log("✅ Baza danych zainicjalizowana pomyślnie!");
});

db.close();
