class ChiefDashboard {
  constructor() {
    this.refreshInterval = CONFIG.REFRESH.DASHBOARD || 10000;
    this.autoRefresh = null;
  }

  async load() {
    console.log('📊 Loading Chief Dashboard...');
    await this.loadStats();
    await this.loadAlerts();
    await this.loadCrewStatus();
    await this.loadResourcesQuick();
    this.startAutoRefresh();
  }

  async loadStats() {
    try {
      const stats = await API.chief.getDashboardStats();
      
      document.getElementById('statCrew').textContent = stats.crew.total;
      document.getElementById('statActiveTasks').textContent = stats.activeTasks.total;
      document.getElementById('statAlertsCount').textContent = stats.alerts.length;
      
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }

  async loadAlerts() {
    try {
      const alerts = await API.chief.getAlerts();
      
      document.getElementById('alertBadge').textContent = alerts.length;
      
      const alertsHtml = alerts.slice(0, 5).map(alert => `
        <div class="alert-item alert-${alert.severity}">
          <div class="alert-icon">
            ${alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟠' : '🔵'}
          </div>
          <div class="alert-content">
            <h4>${alert.message}</h4>
            <small>${Utils.formatTime(alert.created_at)}</small>
          </div>
          <button onclick="chiefDashboard.resolveAlert(${alert.id})" class="btn-sm">✓</button>
        </div>
      `).join('');
      
      document.getElementById('recentAlerts').innerHTML = alertsHtml || '<p>No active alerts</p>';
    } catch (err) {
      console.error('Error loading alerts:', err);
    }
  }

  async resolveAlert(id) {
    // API logic to resolve alert would go here
    await this.loadAlerts();
  }

  async loadCrewStatus() {
    try {
      const crew = await API.chief.getCrew();
      
      const onlineCount = crew.filter(c => c.status === 'online').length;
      const offlineCount = crew.filter(c => c.status === 'offline').length;
      const awayCount = crew.filter(c => c.status === 'away').length;

      const crewHtml = `
        <div class="crew-status-summary" style="display: flex; gap: 15px; margin-top: 10px;">
          <div class="status-box" style="text-align: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 5px; flex: 1;">
            <div class="status-dot online" style="margin-bottom: 5px;"></div>
            <p style="margin: 0; font-size: 14px;">${onlineCount} Online</p>
          </div>
          <div class="status-box" style="text-align: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 5px; flex: 1;">
            <div class="status-dot away" style="margin-bottom: 5px; background: orange;"></div>
            <p style="margin: 0; font-size: 14px;">${awayCount} Away</p>
          </div>
          <div class="status-box" style="text-align: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 5px; flex: 1;">
            <div class="status-dot offline" style="margin-bottom: 5px; background: grey;"></div>
            <p style="margin: 0; font-size: 14px;">${offlineCount} Offline</p>
          </div>
        </div>
      `;
      
      document.getElementById('crewStatusWidget').innerHTML = crewHtml;
    } catch (err) {
      console.error('Error loading crew status:', err);
    }
  }

  async loadResourcesQuick() {
    try {
      const resources = await API.chief.getResources();
      
      const resourcesHtml = resources.map(r => {
        const percentage = (r.current_level / r.max_capacity * 100).toFixed(0);
        const statusClass = r.status === 'critical' ? 'critical' : r.status === 'warning' ? 'warning' : 'normal';
        const color = r.status === 'critical' ? 'red' : r.status === 'warning' ? 'orange' : '#00ffcc';
        
        return `
          <div class="resource-card ${statusClass}" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 5px; margin-bottom: 10px;">
            <h4 style="margin: 0 0 5px 0;">${r.resource_type.toUpperCase()}</h4>
            <div class="gauge-simple" style="background: #2a2f4c; height: 10px; border-radius: 5px; overflow: hidden; margin-bottom: 5px;">
              <div class="gauge-bar">
                <div class="gauge-fill" style="width: ${percentage}%; background: ${color}; height: 100%;"></div>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #aaa;">
               <span>${percentage}%</span>
               <span>Last updated: ${Utils.formatTime(r.updated_at)}</span>
            </div>
          </div>
        `;
      }).join('');
      
      document.getElementById('resourcesWidget').innerHTML = resourcesHtml;
    } catch (err) {
      console.error('Error loading resources:', err);
    }
  }

  startAutoRefresh() {
    if (this.autoRefresh) clearInterval(this.autoRefresh);
    
    this.autoRefresh = setInterval(() => {
      if (app.currentPage === 'dashboard') {
        this.load();
      }
    }, this.refreshInterval);
  }

  destroy() {
    if (this.autoRefresh) {
      clearInterval(this.autoRefresh);
    }
  }
}

const chiefDashboard = new ChiefDashboard();
