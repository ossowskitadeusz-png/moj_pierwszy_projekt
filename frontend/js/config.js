const CONFIG = {
  API_URL: '/api',
  STORAGE_KEY_TOKEN: 'ercc_token',
  STORAGE_KEY_USER: 'ercc_user',
  
  // Refresh intervals (ms)
  REFRESH: {
    TASKS: 10000,        // 10 sekund
    MESSAGES: 3000,      // 3 sekundy
    TEAM: 30000,         // 30 sekund
    FOLDERS: 20000,       // 20 sekund
    RESOURCES: 30000     // 30 sekund
  }
};

const ROUTES = {
  DASHBOARD: 'dashboard',
  TASKS: 'tasks',
  CHAT: 'chat',
  FOLDERS: 'folders',
  APPROVAL: 'approval',
  CREW: 'crew',
  SECTORS: 'sectors',
  RESOURCES: 'resources',
  ALERTS: 'alerts',
  AUDIT: 'audit'
};
