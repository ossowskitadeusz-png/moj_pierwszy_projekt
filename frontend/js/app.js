const app = {
  currentPage: ROUTES.DASHBOARD,
  currentUser: null,

  async init() {
    if (!auth.isLoggedIn()) {
      this.showLoginPage();
      return;
    }

    this.currentUser = auth.getCurrentUser();
    this.showAppPage();
    this.setupEventListeners();
    this.startClock();
    
    // Pokaż tab zatwierdzeń tylko dla chiefa
    if (this.currentUser.role === 'chief_mechanic') {
      document.getElementById('approvalNav').style.display = 'flex';
    }

    this.navigate(ROUTES.DASHBOARD);
  },

  showLoginPage() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('loginName').value;
      const password = document.getElementById('loginPassword').value;
      try {
        await auth.login(name, password);
        window.location.reload();
      } catch (err) {
        document.getElementById('loginError').textContent = 'Błędne dane logowania';
      }
    });
  },

  showAppPage() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appContainer').style.display = 'grid';
    document.getElementById('userNameDisplay').textContent = this.currentUser.name;
    document.getElementById('userRoleDisplay').textContent = this.currentUser.role === 'chief_mechanic' ? 'Chief Mechanic' : 'Engineer';
    document.getElementById('userAvatar').textContent = this.currentUser.name[0].toUpperCase();
  },

  navigate(page) {
    this.currentPage = page;
    
    // Update UI
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(`${page}Page`).style.display = 'block';
    const navItem = document.getElementById(`nav-${page}`) || document.getElementById(`${page}Nav`);
    if (navItem) navItem.classList.add('active');
    
    document.getElementById('pageTitle').textContent = page.charAt(0).toUpperCase() + page.slice(1);

    // Load module data
    switch(page) {
      case ROUTES.DASHBOARD: dashboard.load(); break;
      case ROUTES.TASKS: tasks.load(); break;
      case ROUTES.CHAT: chat.load(); break;
      case ROUTES.FOLDERS: folders.load(); break;
      case ROUTES.APPROVAL: approval.load(); break;
    }
  },

  setupEventListeners() {
    // Clock update
    setInterval(() => this.updateClock(), 1000);
  },

  startClock() {
    this.updateClock();
  },

  updateClock() {
    const now = new Date();
    document.getElementById('timeDisplay').textContent = now.toLocaleTimeString('pl-PL');
  }
};

document.addEventListener('DOMContentLoaded', () => app.init());
