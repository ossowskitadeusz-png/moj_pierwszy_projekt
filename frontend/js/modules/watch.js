class Watch {
  constructor() {
    this.status = null;
    this.assignment = null;
    this.timerInterval = null;
  }

  async load() {
    console.log('⚓ Loading Watch Command...');
    await this.updateStatus();
    await this.loadAssignments();
    this.startTimer();
  }

  async updateStatus() {
    try {
      this.status = await API.watch.getMyStatus();
      this.renderStatus();
    } catch (err) {
      console.error('Error updating watch status:', err);
    }
  }

  async loadAssignments() {
    try {
      this.assignment = await API.watch.getToday();
      this.renderAssignments();
    } catch (err) {
      console.error('Error loading assignments:', err);
    }
  }

  renderStatus() {
    if (!this.status) return;

    const roleMap = {
      'mechanic': 'Duty Engineer (1st Eng)',
      'dayman': 'Watch Dayman',
      'ums_standby': 'Night Watch (UMS Standby)',
      'none': 'Off-Duty'
    };

    // Dane fazy pobierane są teraz bezpośrednio z bazy danych przez API
    const currentPhaseName = this.status.phaseName || 'Off-Duty';
    const currentPhaseTask = this.status.phaseTask || 'Rest / Standby';
    const currentPhaseTime = this.status.phaseTime || '--:--';

    // Update Dashboard Widget
    document.getElementById('currentWatchRole').textContent = roleMap[this.status.role] || 'Off-Duty';
    
    // Update Watch Page
    const phaseNameEl = document.getElementById('watchPhaseName');
    const phaseTimeEl = document.getElementById('watchPhaseTime');
    const phaseTaskEl = document.getElementById('watchPhaseTask');

    if (phaseNameEl) phaseNameEl.textContent = currentPhaseName;
    if (phaseTimeEl) phaseTimeEl.textContent = currentPhaseTime;
    if (phaseTaskEl) phaseTaskEl.textContent = currentPhaseTask;

    this.renderActions();
  }

  renderAssignments() {
    const table = document.getElementById('watchAssignmentsTable');
    if (!table || !this.assignment) return;

    table.innerHTML = `
      <tr>
        <td><strong>Morning</strong></td>
        <td>${this.assignment.morning_mechanic_name}</td>
        <td>${this.assignment.morning_dayman_name}</td>
      </tr>
      <tr>
        <td><strong>Night UMS</strong></td>
        <td>${this.assignment.ums_mechanic_name}</td>
        <td>-</td>
      </tr>
    `;
  }

  renderActions() {
    const container = document.getElementById('watchActiveActions');
    if (!container) return;

    let html = '';
    if (this.status.role === 'dayman' && this.status.phase === 'watch_start') {
      html += '<button class="btn-primary" onclick="watch.showMorningChecklist()">📝 Fill Morning Checklist</button>';
    }
    if (this.status.role === 'mechanic' && this.status.phase === 'noon_log') {
      html += '<button class="btn-primary" onclick="watch.showNoonLogForm()">📖 Fill Engine Log Book</button>';
    }
    
    container.innerHTML = html || '<p style="color: #888;">No active tasks for current phase.</p>';
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    const updateTimer = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      
      // Bardzo prosta logika timera do następnej fazy (na sztywno wg Twojego grafiku)
      const phases = [7.5, 8, 10, 10.5, 12, 13, 16, 22, 31.5]; // 31.5 to 07:30 następnego dnia
      const currentTotalHours = currentHour + (currentMin / 60);
      
      const nextPhaseHour = phases.find(p => p > currentTotalHours) || 7.5;
      
      let diffMin = Math.floor((nextPhaseHour - currentTotalHours) * 60);
      if (diffMin < 0) diffMin += 24 * 60; // Next day

      const h = Math.floor(diffMin / 60);
      const m = diffMin % 60;
      
      document.getElementById('nextPhaseTimer').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      
      // Update progress bar
      const lastPhaseHour = [...phases].reverse().find(p => p <= currentTotalHours) || (currentTotalHours > 22 ? 22 : 0);
      const phaseDuration = (nextPhaseHour - lastPhaseHour) * 60;
      const elapsed = (currentTotalHours - lastPhaseHour) * 60;
      const percent = Math.min(100, Math.max(0, (elapsed / phaseDuration) * 100));
      
      const progressEl = document.getElementById('watchPhaseProgress');
      if (progressEl) progressEl.style.width = `${percent}%`;
    };

    updateTimer();
    this.timerInterval = setInterval(updateTimer, 60000);
  }

  showMorningChecklist() {
    utils.showNotification('Morning Checklist feature coming soon!', 'info');
  }

  showNoonLogForm() {
    utils.showNotification('Engine Log Book form coming soon!', 'info');
  }
}

window.watch = new Watch();
