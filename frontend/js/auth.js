const auth = {
  async login(name, password) {
    try {
      const response = await API.login(name, password);
      localStorage.setItem(CONFIG.STORAGE_KEY_TOKEN, response.token);
      localStorage.setItem(CONFIG.STORAGE_KEY_USER, JSON.stringify(response.user));
      return response.user;
    } catch (error) {
      throw error;
    }
  },

  logout() {
    localStorage.removeItem(CONFIG.STORAGE_KEY_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEY_USER);
    window.location.reload();
  },

  getCurrentUser() {
    const userJson = localStorage.getItem(CONFIG.STORAGE_KEY_USER);
    return userJson ? JSON.parse(userJson) : null;
  },

  isLoggedIn() {
    return !!localStorage.getItem(CONFIG.STORAGE_KEY_TOKEN);
  }
};
