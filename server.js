const express = require('express');
const sqlite3 = require('sqlite3').verbose(); // Dodajemy SQLite
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

const db = new sqlite3.Database('./dashboard.db');

app.use(express.json()); // Pozwala na odbieranie danych JSON z frontendu
app.use(express.static('./'));

app.get('/', (req, res) => {
    // Zmieniamy stronę główną na nasz nowy Dashboard (wersja dla Chiefa lub ogólna)
    res.sendFile(__dirname + '/ercc_layout.html');
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

// --- NOWY ENDPOINT: Przeglądarka Plików ---
app.get('/api/files', (req, res) => {
    // Bazowy folder "Engine_Room_Docs" (musi być w folderze projektu)
    const baseDir = path.join(__dirname, 'Engine_Room_Docs');
    
    // Odczytujemy opcjonalny parametr ?folder= (np. /api/files?folder=01_Manuals_and_Drawings)
    let requestPath = req.query.folder ? req.query.folder : '';
    
    // Zabezpieczenie przed wychodzeniem wyżej (Directory Traversal Attack)
    requestPath = requestPath.replace(/\.\./g, ''); 
    
    const targetDir = path.join(baseDir, requestPath);
    
    // --- SECURITY: Logowanie do Audit Logu ---
    // Pobieramy IP użytkownika (lub localhost jeśli to ten sam komputer)
    const clientIp = req.ip || req.connection.remoteAddress;
    // W przyszłości pobierzemy to z sesji logowania, na razie czytamy z nagłówka lub ustawiamy domyślne
    const user = req.headers['x-user'] || 'Unknown System User';
    
    const action = requestPath === '' ? 'Opened Root Directory' : 'Opened Folder';
    const displayPath = requestPath === '' ? 'Engine_Room_Docs' : requestPath;

    db.run(
        "INSERT INTO audit_logs (user, action, target_path, ip_address) VALUES (?, ?, ?, ?)",
        [user, action, displayPath, clientIp],
        function(err) {
            if (err) console.error("Błąd zapisu do Audit Logu:", err.message);
        }
    );
    // ------------------------------------------

    try {
        if (!fs.existsSync(targetDir)) {
            return res.status(404).json({ error: "Folder not found" });
        }

        const items = fs.readdirSync(targetDir);
        const filesList = items.map(item => {
            const itemPath = path.join(targetDir, item);
            const stats = fs.statSync(itemPath);
            return {
                name: item,
                isDir: stats.isDirectory(),
                size: stats.size, // w bajtach
                modified: stats.mtime
            };
        });

        // Sortowanie: Najpierw foldery, potem pliki
        filesList.sort((a, b) => {
            if (a.isDir === b.isDir) return a.name.localeCompare(b.name);
            return a.isDir ? -1 : 1;
        });

        res.json({
            currentFolder: requestPath,
            contents: filesList
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- NOWY ENDPOINT: Odczyt Audit Logu (tylko dla Chiefa) ---
app.get('/api/audit', (req, res) => {
    db.all("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// --- NOWY ENDPOINT (ALERTY): Sprawdzanie czy są nowe wpisy ---
app.get('/api/audit/check', (req, res) => {
    const since = req.query.since; // np. "2024-04-22 10:00:00"
    if (!since) return res.json({ newCount: 0 });

    db.get("SELECT COUNT(*) as count FROM audit_logs WHERE timestamp > ?", [since], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ newCount: row.count });
    });
});

// --- NOWY ENDPOINT: Zapis Customowego Logu (np. pobranie pliku) ---
app.post('/api/audit', (req, res) => {
    const { user, action, target_path } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    db.run(
        "INSERT INTO audit_logs (user, action, target_path, ip_address) VALUES (?, ?, ?, ?)",
        [user || 'Unknown', action || 'Unknown Action', target_path || '', clientIp],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// --- NOWE ENDPOINTY: Eksport danych do CSV (Raportowanie) ---
app.get('/api/export/audit', (req, res) => {
    db.all("SELECT * FROM audit_logs ORDER BY timestamp DESC", [], (err, rows) => {
        if (err) return res.status(500).send(err.message);
        
        let csv = 'ID,Timestamp,User,Action,Target_Path,IP_Address\n'; // Nagłówki kolumn
        rows.forEach(row => {
            // Dodajemy puste ciągi w razie nulli i zabezpieczamy przecinki w tekstach
            const action = `"${row.action || ''}"`;
            const target = `"${row.target_path || ''}"`;
            csv += `${row.id},${row.timestamp},${row.user},${action},${target},${row.ip_address}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="ERCC_Audit_Log.csv"');
        res.send(csv);
    });
});

app.get('/api/export/maintenance', (req, res) => {
    db.all("SELECT * FROM maintenance_logs ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).send(err.message);
        
        let csv = 'ID,Date,Description,Technician\n'; // Nagłówki kolumn
        rows.forEach(row => {
            const desc = `"${row.description || ''}"`; // np. "Wymiana uszczelki"
            csv += `${row.id},${row.date},${desc},${row.technician}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="ERCC_Maintenance_Log.csv"');
        res.send(csv);
    });
});
// ------------------------

app.listen(port, () => {
    console.log(`🚀 Serwer Dashboardu działa na: http://localhost:${port}`);
});
