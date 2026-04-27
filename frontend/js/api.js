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
}
