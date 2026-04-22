const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dashboard.db');

console.log("📋 Aktualne logi serwisowe pompy:");
console.log("-----------------------------------");

db.all("SELECT * FROM maintenance_logs", [], (err, rows) => {
    if (err) {
        throw err;
    }
    rows.forEach((row) => {
        console.log(`[ID: ${row.id}] Data: ${row.date} | Opis: ${row.description} | Technik: ${row.technician}`);
    });
});

db.close();
