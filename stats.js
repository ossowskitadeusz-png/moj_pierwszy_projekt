const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dashboard.db');

console.log("📊 Raport Analityczny Pompy:");
console.log("----------------------------");

db.get("SELECT COUNT(*) as total FROM maintenance_logs", [], (err, row) => {
    if (err) throw err;
    console.log(`✅ Łączna liczba serwisów: ${row.total}`);
});

db.get("SELECT technician, COUNT(technician) as count FROM maintenance_logs GROUP BY technician ORDER BY count DESC LIMIT 1", [], (err, row) => {
    if (err) throw err;
    if (row) {
        console.log(`👨‍🔧 Główny technik: ${row.technician} (wykonał ${row.count} wpisów)`);
    }
});

db.close();
