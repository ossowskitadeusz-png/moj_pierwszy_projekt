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
      // Get inventory instead of simple resources to have category and more info
      const resources = await API.resources.getInventory();
      
      // Filter for important ones (Fuel, Lube Oils) or anything critical/warning
      const important = resources.filter(r => 
        r.status === 'critical' || 
        r.status === 'warning' || 
        r.category === 'fuel' || 
        (r.category === 'lube_oil' && r.current_level < r.max_capacity * 0.9)
      ).slice(0, 4); // Limit to top 4 for dashboard
      
      const resourcesHtml = important.map(r => {
        const percentage = parseFloat(r.percentage);
        const statusClass = r.status;
        const color = r.status === 'critical' ? 'var(--accent-danger)' : 
                      r.status === 'warning' ? 'var(--accent-warning)' : 
                      'var(--accent-success)';
        
        return `
          <div class="resource-mini-card status-${statusClass}" style="margin-bottom: 12px; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 8px; border-left: 3px solid ${color};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 600; font-size: 0.9rem;">${r.name}</span>
              <span style="font-size: 0.75rem; color: ${color}; font-weight: bold;">${r.status.toUpperCase()}</span>
            </div>
            <div class="progress-container" style="height: 6px; background: rgba(0,0,0,0.3); border-radius: 3px; overflow: hidden; margin-bottom: 5px;">
              <div class="progress-bar" style="width: ${percentage}%; background: ${color}; height: 100%; transition: width 0.5s ease;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted);">
               <span>${r.current_level} / ${r.max_capacity} ${r.unit}</span>
               <span>${percentage}%</span>
            </div>
          </div>
        `;
      }).join('');
      
      document.getElementById('resourcesWidget').innerHTML = resourcesHtml || '<p style="text-align:center; color:gray; padding:20px;">No critical resources</p>';
    } catch (err) {
      console.error('Error loading resources quick view:', err);
      document.getElementById('resourcesWidget').innerHTML = '<p class="error">Failed to load resources</p>';
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
