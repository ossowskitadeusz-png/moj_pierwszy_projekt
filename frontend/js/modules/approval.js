const approval = {
  async load() {
    if (app.currentUser.role !== 'chief_mechanic') return;

    try {
      const allTasks = await API.getAllTasks();
      // Pokazujemy tylko te, które wymagają zatwierdzenia lub zostały utworzone dla kogoś innego
      const html = allTasks.map(t => `
        <div class="card" style="margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h4 style="margin-bottom:5px;">${t.title}</h4>
            <small style="color:var(--text-muted);">Przypisane do: <strong>${t.assigned_name}</strong> | Status: ${t.approval_status}</small>
          </div>
          <div style="display:flex; gap:10px;">
            ${t.approval_status === 'pending' ? `
              <button onclick="approval.update('${t.id}', 'approved')" class="btn-primary" style="background:var(--accent-success); padding:6px 12px; font-size:0.8rem;">Zatwierdź</button>
              <button onclick="approval.update('${t.id}', 'rejected')" class="btn-primary" style="background:var(--accent-danger); padding:6px 12px; font-size:0.8rem;">Odrzuć</button>
            ` : `
              <span class="badge ${t.approval_status === 'approved' ? 'badge-success' : 'badge-danger'}">${t.approval_status.toUpperCase()}</span>
            `}
          </div>
        </div>
      `).join('');

      document.getElementById('approvalList').innerHTML = html || '<p class="placeholder">Brak zadań do weryfikacji</p>';
    } catch (err) {
      console.error('Błąd ładowania zatwierdzeń:', err);
    }
  },

  async update(taskId, status) {
    try {
      await API.approveTask(taskId, status);
      this.load();
      ui.showNotification(`Zadanie zostało ${status === 'approved' ? 'zatwierdzone' : 'odrzucone'}.`, 'success');
    } catch (err) {
      alert('Błąd: ' + err.message);
    }
  }
};
