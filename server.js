const express = require('express');
const sqlite3 = require('sqlite3').verbose(); // Dodajemy SQLite
const app = express();
const port = 3000;

const db = new sqlite3.Database('./dashboard.db');

app.use(express.static('./'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/test_1.html');
});

// --- NOWA SEKCJA: API ---
app.get('/api/logs', (req, res) => {
    db.all("SELECT * FROM maintenance_logs", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows); // Wysyłamy dane jako JSON
    });
});
// ------------------------

app.listen(port, () => {
    console.log(`🚀 Serwer Dashboardu działa na: http://localhost:${port}`);
});
