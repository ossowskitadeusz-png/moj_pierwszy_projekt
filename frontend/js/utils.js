const utils = {
  formatDate(dateString) {
    if (!dateString) return 'Brak';
    return new Date(dateString).toLocaleDateString('pl-PL');
  },

  getStatusBadge(status) {
    const badges = {
      'pending': '<span class="badge badge-warning">Oczekujące</span>',
      'in_progress': '<span class="badge badge-info">W trakcie</span>',
      'completed': '<span class="badge badge-success">Ukończone</span>',
      'cancelled': '<span class="badge badge-danger">Anulowane</span>'
    };
    return badges[status] || status;
  },

  getPriorityBadge(priority) {
    const badges = {
      'low': '<span class="badge badge-success">Niski</span>',
      'medium': '<span class="badge badge-info">Średni</span>',
      'high': '<span class="badge badge-warning">Wysoki</span>',
      'critical': '<span class="badge badge-danger">Krytyczny</span>'
    };
    return badges[priority] || priority;
  }
};

const ui = {
  showModal(id) { document.getElementById(id).style.display = 'flex'; },
  closeModal(id) { document.getElementById(id).style.display = 'none'; },
  
  showNotification(message, type = 'info') {
    alert(message); // Uproszczone na start
  }
};

const Utils = {
  formatDate: utils.formatDate,
  formatTime(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pl-PL');
  },
  showNotification(message, type) {
    ui.showNotification(message, type);
  }
};
