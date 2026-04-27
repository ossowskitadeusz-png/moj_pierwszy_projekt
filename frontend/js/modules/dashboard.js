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
    } catch (err) {
      console.error('Błąd ładowania dashboardu:', err);
    }
  }
};
