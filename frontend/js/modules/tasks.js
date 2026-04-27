const tasks = {
  async load() {
    try {
      const allTasks = await API.getTasks();
      const statusFilter = document.getElementById('filterStatus').value;
      const priorityFilter = document.getElementById('filterPriority').value;

      const filtered = allTasks.filter(t => {
        return (!statusFilter || t.status === statusFilter) &&
               (!priorityFilter || t.priority === priorityFilter);
      });

      const html = filtered.map(t => `
        <div class="task-card">
          <div style="display:flex; justify-content:space-between; align-items:start;">
            <h3>${t.title}</h3>
            ${utils.getPriorityBadge(t.priority)}
          </div>
          <p>${t.description || 'No description provided'}</p>
          <div class="task-footer">
            ${utils.getStatusBadge(t.status)}
            <select onchange="tasks.updateStatus(${t.id}, this.value)" style="padding:4px; font-size:0.8rem;">
              <option value="pending" ${t.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="completed" ${t.status === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
          </div>
          <small style="display:block; margin-top:10px; color:var(--text-muted);">Due: ${utils.formatDate(t.due_date)}</small>
        </div>
      `).join('');

      document.getElementById('tasksList').innerHTML = html || '<p class="placeholder">No Work Orders match the filters</p>';
    } catch (err) {
      console.error('Błąd ładowania zadań:', err);
    }
  },

  async updateStatus(id, status) {
    try {
      await API.updateTaskStatus(id, status);
      this.load();
    } catch (err) {
      alert('Błąd aktualizacji statusu: ' + err.message);
    }
  },

  async showCreateModal() {
    // Pobierz zespół do selecta
    try {
      const team = await API.getTeam();
      const select = document.getElementById('taskAssignedTo');
      select.innerHTML = '<option value="">Select...</option>' + 
        team.map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('');
      
      ui.showModal('taskModal');
    } catch (err) {
      alert('Error fetching crew list');
    }
  }
};

// Event listener dla formularza (raz przy starcie)
document.getElementById('createTaskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    title: document.getElementById('taskTitle').value,
    description: document.getElementById('taskDesc').value,
    assigned_to: parseInt(document.getElementById('taskAssignedTo').value),
    priority: document.getElementById('taskPriority').value,
    due_date: document.getElementById('taskDueDate').value
  };

  try {
    await API.createTask(data);
    ui.closeModal('taskModal');
    tasks.load();
    e.target.reset();
  } catch (err) {
    alert('Error creating Work Order: ' + err.message);
  }
});
