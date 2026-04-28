class WatchAssignments {
  constructor() {
    this.eligibleUsers = [];
    this.assignments = [];
  }

  async load() {
    console.log('👥 Loading Watch Assignments...');
    await this.fetchData();
    this.render();
  }

  async fetchData() {
    try {
      this.eligibleUsers = await API.crew.getEligible();
      this.assignments = await API.crew.getAssignments();
    } catch (err) {
      console.error('Error fetching crew data:', err);
    }
  }

  render() {
    const mechs = this.eligibleUsers.filter(u => u.role === 'mechanic');
    const days = this.eligibleUsers.filter(u => u.role === 'dayman');

    for (let i = 1; i <= 3; i++) {
      this.populateSelect(`mech${i}_select`, mechs, this.assignments.find(a => a.watch_position === i)?.mechanic_id);
      this.populateSelect(`day${i}_select`, days, this.assignments.find(a => a.watch_position === i)?.dayman_id);
    }
  }

  populateSelect(id, users, selectedId) {
    const select = document.getElementById(id);
    if (!select) return;

    select.innerHTML = '<option value="">-- Select Person --</option>' + 
      users.map(u => `<option value="${u.id}" ${u.id === selectedId ? 'selected' : ''}>${u.name}</option>`).join('');
  }

  async saveAssignments() {
    const assignments = [];
    for (let i = 1; i <= 3; i++) {
      const mechanic_id = document.getElementById(`mech${i}_select`).value;
      const dayman_id = document.getElementById(`day${i}_select`).value;
      if (mechanic_id && dayman_id) {
        assignments.push({ pos: i, mechanic_id: parseInt(mechanic_id), dayman_id: parseInt(dayman_id) });
      }
    }

    try {
      const res = await API.crew.saveAssignments(assignments);
      if (res.success) {
        utils.showNotification('Assignments saved successfully!', 'success');
        if (window.watch) watch.load();
      }
    } catch (err) {
      utils.showNotification('Error saving assignments: ' + err.message, 'error');
    }
  }
}

window.watchCrew = new WatchAssignments();
