class Dashboard {
  constructor() {
    this.currentPhase = null;
    this.watchAssignment = null;
    this.clockInterval = null;
    this.phaseCheckInterval = null;
    this.alertCheckInterval = null;
  }

  async load() {
    console.log('📊 Loading Dashboard...');
    
    // Ustaw greeting
    this.setGreeting();
    
    // Uruchom clock
    this.startClock();
    
    // Załaduj dane
    await this.loadWatchAssignment();
    await this.loadCurrentPhase();
    // await this.loadActiveAlerts(); // Implementacja alertów w Tier 2
    
    // Uruchom periodyczne aktualizacje (co minutę dla fazy)
    this.phaseCheckInterval = setInterval(() => this.loadCurrentPhase(), 60000);
    
    console.log('✅ Dashboard loaded');
  }

  // ===== GREETING =====
  setGreeting() {
    const hour = new Date().getHours();
    let greeting = '';
    let emoji = '';

    if (hour >= 5 && hour < 12) {
      greeting = 'Good morning';
      emoji = '🌅';
    } else if (hour >= 12 && hour < 17) {
      greeting = 'Good afternoon';
      emoji = '☀️';
    } else if (hour >= 17 && hour < 21) {
      greeting = 'Good evening';
      emoji = '🌆';
    } else {
      greeting = 'Good night';
      emoji = '🌙';
    }

    const userName = app.currentUser?.name || 'Engineer';
    const greetingEl = document.getElementById('userGreeting');
    const msgEl = document.getElementById('greetingMessage');
    
    if (greetingEl) greetingEl.textContent = userName;
    if (msgEl) msgEl.textContent = `${emoji} ${greeting}!`;

    // Set vessel status
    const vesselStatusEl = document.getElementById('vesselStatus');
    if (vesselStatusEl) vesselStatusEl.textContent = 'At Sea';
  }

  // ===== DIGITAL CLOCK =====
  startClock() {
    this.updateClock();
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
  }

  updateClock() {
    const now = new Date();
    
    // Digital time
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const hEl = document.getElementById('clockHours');
    const mEl = document.getElementById('clockMinutes');
    const sEl = document.getElementById('clockSeconds');
    const pEl = document.getElementById('clockPeriod');

    if (hEl) hEl.textContent = hours;
    if (mEl) mEl.textContent = minutes;
    if (sEl) sEl.textContent = seconds;
    if (pEl) pEl.textContent = now.getHours() >= 12 ? 'PM' : 'AM';

    // Calendar
    this.updateCalendar(now);

    // Analog clock
    this.updateAnalogClock(now);
  }

  updateCalendar(now) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];

    const dayOfWeek = days[now.getDay()];
    const date = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();

    const dowEl = document.getElementById('dayOfWeek');
    const fdEl = document.getElementById('fullDate');

    if (dowEl) dowEl.textContent = dayOfWeek;
    if (fdEl) fdEl.textContent = `${month} ${date}, ${year}`;
  }

  updateAnalogClock(now) {
    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    const hourDegrees = (hours * 30) + (minutes * 0.5);
    const minuteDegrees = (minutes * 6) + (seconds * 0.1);
    const secondDegrees = seconds * 6;

    const hourHand = document.getElementById('hourHand');
    const minuteHand = document.getElementById('minuteHand');
    const secondHand = document.getElementById('secondHand');

    if (hourHand) hourHand.style.transform = `rotate(${hourDegrees}deg)`;
    if (minuteHand) minuteHand.style.transform = `rotate(${minuteDegrees}deg)`;
    if (secondHand) secondHand.style.transform = `rotate(${secondDegrees}deg)`;
  }

  // ===== DATA LOADING =====
  async loadWatchAssignment() {
    try {
      this.watchAssignment = await API.request('/watch-management/today');
      this.displayWatchInfo();
    } catch (err) {
      console.error('Error loading watch:', err);
    }
  }

  async loadCurrentPhase() {
    try {
      const status = await API.request('/watch-management/my-status');
      const nameEl = document.getElementById('dashboardPhaseName');
      const timeEl = document.getElementById('dashboardPhaseTime');
      const statusEl = document.getElementById('watchStatus');

      if (nameEl) nameEl.textContent = status.phaseName || 'Off-Duty';
      if (timeEl) timeEl.textContent = status.phaseTime || '--:--';
      if (statusEl) statusEl.textContent = status.phaseName || 'Rest';
    } catch (err) {
      console.error('Error loading current phase:', err);
    }
  }

  displayWatchInfo() {
    const container = document.getElementById('todayWatchInfo');
    if (!container || !this.watchAssignment) return;

    const wa = this.watchAssignment;
    const html = `
      <div class="watch-info-item">
        <strong>🌅 Morning Watch (07:30 - 12:00)</strong>
        <span>Eng: ${wa.m1_name || 'Unassigned'} | Day: ${wa.d1_name || 'Unassigned'}</span>
      </div>
      <div class="watch-info-item">
        <strong>☀️ Afternoon Duty (12:00 - 17:00)</strong>
        <span>Eng: ${wa.m2_name || 'Unassigned'} | Day: ${wa.d2_name || 'Unassigned'}</span>
      </div>
      <div class="watch-info-item">
        <strong>🌙 Night UMS (22:00 - 07:30)</strong>
        <span>Eng: ${wa.m3_name || 'Unassigned'} | Day: ${wa.d3_name || 'Unassigned'}</span>
      </div>
    `;
    container.innerHTML = html;
  }

  destroy() {
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.phaseCheckInterval) clearInterval(this.phaseCheckInterval);
  }
}

window.dashboard = new Dashboard();
