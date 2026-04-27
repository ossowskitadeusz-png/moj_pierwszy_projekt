const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ===== INICJALIZACJA BAZY =====
const db = require('./db');

// ===== IMPORTUJ ROUTES =====
const authRoutes = require('./routes/auth.routes');
const tasksRoutes = require('./routes/tasks.routes');
const messagesRoutes = require('./routes/messages.routes');
const foldersRoutes = require('./routes/folders.routes');
const usersRoutes = require('./routes/users.routes');
const chiefRoutes = require('./routes/chief.routes');  // ← NEW

// ===== REJESTRACJA ROUTES =====
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/folders', foldersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/chief', chiefRoutes);  // ← NEW

// ===== CATCH-ALL: Serwuj SPA =====
app.get('*', (req, res) => {
  // Jeśli to zapytanie API, a nie ma go wyżej, zwróć 404
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  // Dla wszystkich innych (nawigacja frontendowa) serwuj index.html
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 ERCC Server running on http://localhost:${PORT}`);
  console.log(`📁 Frontend: http://localhost:${PORT}`);
});
