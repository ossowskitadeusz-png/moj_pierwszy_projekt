const dashboard = {
  async load() {
    try {
      const tasks = await API.getTasks();
      
      const myTasks = tasks.filter(t => t.assigned_to === app.currentUser.id);
      const pending = tasks.filter(t => t.status === 'pending');
      const inProgress = tasks.filter(t => t.status === 'in_progress');
      const completed = tasks.filter(t => t.status === 'completed');

      document.getElementById('statMyTasks').textContent = myTasks.length;
      document.getElementById('statPending').textContent = pending.length;
      document.getElementById('statInProgress').textContent = inProgress.length;
      document.getElementById('statCompleted').textContent = completed.length;

      // Mock recent activity based on tasks
      const activities = tasks.slice(0, 5).map(t => `
        <div class="activity-item">
          <i class="fa-solid fa-circle-dot"></i>
          <span>Work Order <strong>${t.title}</strong> is currently ${t.status}</span>
          <small>${utils.formatDate(t.created_at)}</small>
        </div>
      `).join('');
      
      document.getElementById('recentActivityList').innerHTML = activities || '<p class="placeholder">No recent activity</p>';
      
      await this.loadPendingReports();
    } catch (err) {
      console.error('Błąd ładowania dashboardu:', err);
    }
  },

  async loadPendingReports() {
    const container = document.getElementById('pendingReportsWidget');
    const section = document.getElementById('mechanicReportsSection');
    
    if (!container || app.currentUser.role !== 'mechanic') return;

    try {
      const reports = await API.resources.getMyReports();
      const pending = reports.filter(r => r.status === 'pending');

      if (pending.length > 0) {
        section.style.display = 'block';
        
        container.innerHTML = pending.map(r => `
          <div class="report-mini-card" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; margin-bottom: 8px;">
            <div>
              <strong style="color: var(--accent-secondary);">${r.report_type.replace(/_/g, ' ').toUpperCase()}</strong>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Due: ${r.due_date} | Resource: ${r.resource_name || 'N/A'}</div>
            </div>
            <button onclick="app.navigate('resources')" class="btn-primary btn-sm">Fill Now</button>
          </div>
        `).join('');
      } else {
        section.style.display = 'none';
      }
    } catch (err) {
      console.error('Error loading pending reports:', err);
      container.innerHTML = '<p class="error">Failed to load reports</p>';
    }
  }
};
