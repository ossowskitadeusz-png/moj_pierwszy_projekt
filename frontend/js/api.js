class API {
  static async request(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem(CONFIG.STORAGE_KEY_TOKEN);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(`${CONFIG.API_URL}${endpoint}`, options);

      if (response.status === 401) {
        auth.logout();
        throw new Error('Session expired');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ API Error:', error);
      throw error;
    }
  }

  // ===== AUTH =====
  static login(name, password) {
    return this.request('/auth/login', 'POST', { name, password });
  }

  static verify() {
    return this.request('/auth/verify', 'POST');
  }

  // ===== TASKS =====
  static getTasks() { return this.request('/tasks'); }
  static getAllTasks() { return this.request('/tasks/all'); }
  static createTask(data) { return this.request('/tasks', 'POST', data); }
  static updateTaskStatus(id, status) { return this.request(`/tasks/${id}/status`, 'PUT', { status }); }
  static approveTask(id, status) { return this.request(`/tasks/${id}/approve`, 'PUT', { approval_status: status }); }

  // ===== MESSAGES =====
  static getMessages(userId) { return this.request(`/messages/${userId}`); }
  static sendMessage(to_user_id, content) { return this.request('/messages', 'POST', { to_user_id, content }); }
  static getTeam() { return this.request('/users/team'); }

  // ===== FOLDERS =====
  static getFolders() { return this.request('/folders'); }
  static createFolder(name) { return this.request('/folders', 'POST', { name }); }

  // ===== CHIEF CREW METHODS =====
  static chief = {
    getCrew: () => API.request('/chief/crew'),
    
    // ===== SECTOR METHODS =====
    getSectors: () => API.request('/chief/sectors'),
    getSector: (sectorId) => API.request(`/chief/sectors/${sectorId}`),
    createSector: (sectorData) => API.request('/chief/sectors', 'POST', sectorData),
    updateSector: (sectorId, sectorData) => API.request(`/chief/sectors/${sectorId}`, 'PUT', sectorData),
    deleteSector: (sectorId) => API.request(`/chief/sectors/${sectorId}`, 'DELETE'),
    updateSectorStatus: (sectorId, status) => API.request(`/chief/sectors/${sectorId}/status`, 'PATCH', { status }),
    getSectorTemplates: () => API.request('/chief/sectors-templates'),
    
    assignCrewToSector: (crewId, sectorId) => 
      API.request(`/chief/crew/${crewId}/assign-sector`, 'PUT', { sector_id: sectorId }),
    
    undoCrewAssignment: (crewId) =>
      API.request(`/chief/crew/${crewId}/undo-assignment`, 'POST'),
    
    getCrewHistory: (crewId) =>
      API.request(`/chief/crew/${crewId}/history`),
    
    getDashboardStats: () => API.request('/chief/dashboard'),
    getAlerts: () => API.request('/chief/alerts'),
    getResources: () => API.request('/chief/resources'),
    updateResource: (resourceType, level, notes) =>
      API.request('/chief/resources/update', 'POST', { resource_type: resourceType, current_level: level, notes }),
    resolveAlert: (alertId) =>
      API.request(`/chief/alerts/${alertId}/resolve`, 'PUT'),

    // Chief resource management
    assignReport: (crewId, reportType, resourceId, dueDate) =>
      API.request('/resources/assign-report', 'POST', {
        crew_member_id: crewId, report_type: reportType,
        resource_id: resourceId, due_date: dueDate
      }),
    verifyReport: (reportId, verified, notes) =>
      API.request(`/resources/reports/${reportId}/verify`, 'PUT', { verified, notes }),
    getAllReports: () => API.request('/resources/reports/all'),
    getAssignments: () => API.request('/resources/assignments')
  };

  // ===== REPORTS & EXCEL INTEGRATION =====
  static reports = {
    // Pobierz template Excel'a
    downloadTemplate: (reportId) => {
      // Direct download - nie przez fetch
      window.location.href = `${CONFIG.API_URL}/reports/template/${reportId}`;
    },

    // Wyślij wypełniony Excel
    uploadReport: (reportId, file) => {
      const formData = new FormData();
      formData.append('report_file', file);
      
      return fetch(`${CONFIG.API_URL}/reports/${reportId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem(CONFIG.STORAGE_KEY_TOKEN)}`
        },
        body: formData
      }).then(r => r.json());
    },

    // Pobierz wszystkie raporty (Chief)
    getAllReports: () => API.request('/reports/all'),

    // Weryfikuj raport (Chief)
    verifyReport: (reportId, verified, notes) =>
      API.request(`/reports/${reportId}/verify`, 'PUT', { verified, verification_notes: notes }),

    // Wygeneruj finalne raporty dla firmy
    generateMonthlyReport: (yearMonth) =>
      API.request(`/reports/generate-monthly/${yearMonth}`, 'POST'),

    // Lista moich plików
    listMyFiles: () => API.request('/reports/my-files')
  };

  // ===== WATCH MANAGEMENT =====
  static watch = {
    getToday: () => API.request('/watch-management/today'),
    getMyStatus: () => API.request('/watch-management/my-status'),
    logParameters: (data) => API.request('/watch-management/log-parameters', 'POST', data)
  };

  // ===== CREW MANAGEMENT =====
  static crew = {
    getEligible: () => API.request('/crew/eligible'),
    getAssignments: () => API.request('/crew/assignments'),
    saveAssignments: (assignments) => API.request('/crew/save-assignments', 'POST', { assignments })
  };

  // ===== RESOURCES (dostępne dla wszystkich zalogowanych) =====
  static resources = {
    getInventory: () => API.request('/resources/inventory'),
    getDetail: (resourceId) => API.request(`/resources/detail/${resourceId}`),
    getTanks: (type) => API.request(`/resources/tanks${type ? '?type=' + type : ''}`),
    getMyReports: () => API.request('/resources/reports/my'),
    getReportDetail: (reportId) => API.request(`/resources/reports/${reportId}/detail`),
    submitFuelSounding: (reportId, soundings, notes) =>
      API.request(`/resources/reports/${reportId}/submit-fuel`, 'POST', { soundings, notes }),
    submitReport: (reportId, currentLevel, notes) =>
      API.request(`/resources/reports/${reportId}/submit`, 'POST', { current_level: currentLevel, notes }),
    getTrends: (resourceId) => API.request(`/resources/trends/${resourceId}`)
  };
}
