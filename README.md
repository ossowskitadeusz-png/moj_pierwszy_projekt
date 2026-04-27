# ERCC - Engine Room Command Center 🚢

Professional Maritime Management System for the Engine Department, built adhering to the **"Constitution-First" methodology** and clean architecture principles.

## 🚀 System Architecture

This project has evolved into a robust **Single Page Application (SPA)** with a decoupled backend and database.

### Technology Stack
- **Frontend**: Vanilla JavaScript (SPA router), HTML5, custom CSS (Maritime UI).
- **Backend**: Node.js with Express.
- **Database**: SQLite3 with strict schema constraints.
- **Authentication**: JWT tokens and bcrypt password hashing.

## 📂 Project Structure

```
ERCC-Team-Manager/
├── backend/
│   ├── server.js          # Main Express server and router
│   ├── db.js              # SQLite connection and schema definition
│   ├── seed.js            # Initial data population (Demo accounts & tasks)
│   ├── middleware/        # JWT Authorization middleware
│   └── routes/            # REST API controllers (auth, tasks, messages, folders)
├── frontend/
│   ├── index.html         # Main SPA shell (Login + Dashboard layout)
│   ├── css/style.css      # Professional Dark Maritime Theme
│   └── js/
│       ├── app.js         # Navigation and core SPA logic
│       ├── api.js         # Centralized API requests
│       ├── auth.js        # Session management
│       └── modules/       # Decoupled feature modules (tasks, chat, folders)
└── data/                  # Physical storage for technical manuals
```

## 🔐 Demo Accounts
- **Chief Engineer**: `chief` / `chief123` (Access to Work Order Approvals)
- **Mechanic/Engineer**: `j.smith` / `pass123`

## ⚙️ Core Modules
1. **Dashboard**: Real-time status overview of all pending/completed tasks.
2. **Work Orders**: Task assignment and status tracking.
3. **Comms Log**: Real-time instant messaging between crew members.
4. **Technical Manuals**: System for managing PDF documentation directories.

## 🛠️ How to run locally
1. Install dependencies: `npm install`
2. Seed the database: `npm run seed`
3. Start the server: `npm start`
4. Open the browser: `http://localhost:3000`

---
*Developed under the guidelines of the "Constitution-First" engineering principles.*