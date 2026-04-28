// ===== RESOURCES MONITOR MODULE =====
class ResourcesModule {
  constructor() {
    this.inventory = [];
    this.myReports = [];
    this.allReports = [];
    this.currentTab = 'inventory';
    this.currentCategory = '';
    this.refreshInterval = null;
  }

  async load() {
    console.log('⛽ Loading Resources Monitor...');

    // Show/hide Chief-only tabs
    const assignTab = document.getElementById('assignTab');
    const verifyTab = document.getElementById('verifyTab');
    if (assignTab) assignTab.style.display = (app.currentUser.role === 'chief_engineer') ? 'inline-block' : 'none';
    if (verifyTab) verifyTab.style.display = (app.currentUser.role === 'chief_engineer') ? 'inline-block' : 'none';

    this.switchTab(this.currentTab);
    this.startAutoRefresh();
  }

  switchTab(tab) {
    this.currentTab = tab;

    // Update tab buttons
    document.querySelectorAll('#resourcesPage .tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`#resourcesPage .tab-btn[data-tab="${tab}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Hide all tab contents
    document.querySelectorAll('#resourcesPage .tab-content').forEach(tc => tc.style.display = 'none');
    const tabEl = document.getElementById(`resources-tab-${tab}`);
    if (tabEl) tabEl.style.display = 'block';

    // Load data for the active tab
    switch (tab) {
      case 'inventory': this.loadInventory(); break;
      case 'reports': this.loadMyReports(); break;
      case 'trends': this.loadTrendsOverview(); break;
      case 'assign': this.loadAssignForm(); break;
      case 'verify': this.loadAllReports(); break;
    }
  }

  // ==========================================
  // TAB 1: CURRENT INVENTORY
  // ==========================================
  async loadInventory() {
    try {
      this.inventory = await API.resources.getInventory();
      this.renderInventory();
    } catch (err) {
      Utils.showNotification(`Error loading inventory: ${err.message}`, 'error');
    }
  }

  filterByCategory(category) {
    this.currentCategory = category;
    this.renderInventory();
  }

  renderInventory() {
    const container = document.getElementById('inventoryGrid');
    if (!container) return;

    let filtered = this.inventory;
    if (this.currentCategory) {
      filtered = filtered.filter(r => r.category === this.currentCategory);
    }

    if (filtered.length === 0) {
      container.innerHTML = '<p style="color:#888; text-align:center; padding:40px;">No resources found for this category.</p>';
      return;
    }

    // Group by category
    const groups = {};
    filtered.forEach(r => {
      const cat = r.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(r);
    });

    const categoryLabels = {
      fuel: '⛽ Fuel',
      lube_oil: '🛢️ Lube Oils',
      hydraulic: '💧 Hydraulic Fluids',
      water_treatment: '🌊 Water Treatment',
      gas_bottles: '🔋 Gas Bottles',
      chemicals: '🧪 Chemicals'
    };

    let html = '';
    for (const [cat, items] of Object.entries(groups)) {
      html += `<div class="resource-category-header">${categoryLabels[cat] || cat}</div>`;
      html += '<div class="resource-cards-row">';

      items.forEach(item => {
        const pct = item.percentage || 0;
        const barColor = item.status === 'critical' ? '#ef4444' :
                         item.status === 'warning' ? '#f59e0b' :
                         item.status === 'optimal' ? '#10b981' : '#3b82f6';

        const statusEmoji = item.status === 'critical' ? '🔴' :
                            item.status === 'warning' ? '🟠' :
                            item.status === 'optimal' ? '🟢' : '🔵';

        html += `
          <div class="resource-card resource-status-${item.status}" onclick="resources.showResourceDetail(${item.id})">
            <div class="resource-card-header">
              <span class="resource-card-name">${item.name}</span>
              <span class="resource-card-status">${statusEmoji} ${item.status.toUpperCase()}</span>
            </div>
            <div class="resource-bar-container">
              <div class="resource-bar" style="width: ${pct}%; background: ${barColor};"></div>
            </div>
            <div class="resource-card-stats">
              <span>${item.current_level} / ${item.max_capacity} ${item.unit}</span>
              <span class="resource-pct">${pct}%</span>
            </div>
            <div class="resource-card-meta">
              <span>📍 ${item.location || '-'}</span>
              <span>🏭 ${item.supplier || '-'}</span>
            </div>
            ${item.last_updated ? `<div class="resource-card-updated">Updated: ${Utils.formatTime(item.last_updated)}</div>` : ''}
          </div>
        `;
      });

      html += '</div>';
    }

    container.innerHTML = html;
  }

  async showResourceDetail(resourceId) {
    try {
      const resource = await API.resources.getDetail(resourceId);
      let detailHtml = `
        <h3>${resource.name}</h3>
        <div class="detail-grid">
          <div><strong>Type:</strong> ${resource.resource_type}</div>
          <div><strong>Category:</strong> ${resource.category}</div>
          <div><strong>Level:</strong> ${resource.current_level} / ${resource.max_capacity} ${resource.unit}</div>
          <div><strong>Status:</strong> ${resource.status.toUpperCase()}</div>
          <div><strong>Location:</strong> ${resource.location || '-'}</div>
          <div><strong>Supplier:</strong> ${resource.supplier || '-'}</div>
          <div><strong>Critical Threshold:</strong> ${resource.critical_threshold} ${resource.unit}</div>
          <div><strong>Warning Threshold:</strong> ${resource.warning_threshold} ${resource.unit}</div>
        </div>
      `;

      if (resource.history && resource.history.length > 0) {
        detailHtml += '<h4 style="margin-top:15px;">Recent History</h4>';
        detailHtml += '<div class="history-entries">';
        resource.history.forEach(h => {
          detailHtml += `
            <div class="history-entry">
              <span>${h.change_reason || '-'}: ${h.level_before || '?'} → ${h.level_after || '?'}</span>
              <span class="history-time">${Utils.formatTime(h.recorded_at)}</span>
            </div>
          `;
        });
        detailHtml += '</div>';
      }

      document.getElementById('resourceDetailContent').innerHTML = detailHtml;
      ui.showModal('resourceDetailModal');
    } catch (err) {
      Utils.showNotification(`Error: ${err.message}`, 'error');
    }
  }

  // ==========================================
  // TAB 2: MY REPORTS (Crew view)
  // ==========================================
  async loadMyReports() {
    try {
      this.myReports = await API.resources.getMyReports();
      this.renderMyReports();
    } catch (err) {
      Utils.showNotification(`Error loading reports: ${err.message}`, 'error');
    }
  }

  renderMyReports() {
    const container = document.getElementById('myReportsList');
    if (!container) return;

    if (this.myReports.length === 0) {
      container.innerHTML = '<p style="color:#888; text-align:center; padding:40px;">No reports assigned to you.</p>';
      return;
    }

    const reportTypeLabels = {
      fuel_sounding: '⛽ Fuel Sounding',
      lube_oil_check: '🛢️ Lube Oil Check',
      hydraulic_check: '💧 Hydraulic Check',
      water_treatment_check: '🌊 Water Treatment',
      gas_bottles_count: '🔋 Gas Bottles Count',
      chemicals_stock: '🧪 Chemicals Stock'
    };

    const html = this.myReports.map(report => {
      const statusClass = report.actual_status === 'overdue' ? 'overdue' :
                          report.actual_status === 'pending' ? 'pending' :
                          report.actual_status === 'submitted' ? 'submitted' :
                          report.actual_status === 'verified' ? 'verified' : '';

      const canSubmit = report.status === 'pending';

      return `
        <div class="report-card report-${statusClass}">
          <div class="report-card-header">
            <span class="report-type">${reportTypeLabels[report.report_type] || report.report_type}</span>
            <span class="report-status badge-${statusClass}">${(report.actual_status || report.status).toUpperCase()}</span>
          </div>
          <div class="report-card-body">
            <div>Resource: <strong>${report.resource_name || '-'}</strong></div>
            <div>Due: <strong>${report.due_date || '-'}</strong></div>
            <div>Assigned by: ${report.assigned_by_name || '-'}</div>
            ${report.submitted_date ? `<div>Submitted: ${Utils.formatTime(report.submitted_date)}</div>` : ''}
          </div>
          ${canSubmit ? `
            <div class="report-card-actions">
              ${report.report_type === 'fuel_sounding' ?
                `<button onclick="resources.showFuelSoundingForm(${report.id})" class="btn-primary">⛽ Fill Sounding</button>` :
                `<button onclick="resources.showSubmitForm(${report.id}, '${report.resource_name}', '${report.unit || 'Units'}')" class="btn-primary">📋 Submit Report</button>`
              }
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  // ==========================================
  // SUBMIT GENERIC REPORT FORM
  // ==========================================
  showSubmitForm(reportId, resourceName, unit) {
    document.getElementById('submitReportId').value = reportId;
    document.getElementById('submitResourceName').textContent = resourceName || 'Resource';
    document.getElementById('submitUnitLabel').textContent = unit || 'Units';
    document.getElementById('submitLevel').value = '';
    document.getElementById('submitNotes').value = '';
    ui.showModal('submitReportModal');
  }

  async handleSubmitReport(event) {
    event.preventDefault();
    const reportId = document.getElementById('submitReportId').value;
    const currentLevel = parseFloat(document.getElementById('submitLevel').value);
    const notes = document.getElementById('submitNotes').value;

    if (isNaN(currentLevel) || currentLevel < 0) {
      Utils.showNotification('Please enter a valid level', 'error');
      return;
    }

    try {
      await API.resources.submitReport(reportId, currentLevel, notes);
      Utils.showNotification('✅ Report submitted successfully!', 'success');
      ui.closeModal('submitReportModal');
      this.loadMyReports();
    } catch (err) {
      Utils.showNotification(`Error: ${err.message}`, 'error');
    }
  }

  // ==========================================
  // FUEL SOUNDING FORM
  // ==========================================
  async showFuelSoundingForm(reportId) {
    document.getElementById('fuelReportId').value = reportId;
    document.getElementById('fuelSoundingNotes').value = '';

    try {
      const tanks = await API.resources.getTanks();
      const fuelTanks = tanks.filter(t => ['HFO', 'MDO', 'MGO'].includes(t.resource_type));

      const html = fuelTanks.map(tank => `
        <div class="sounding-row">
          <div class="sounding-tank-info">
            <strong>${tank.tank_name}</strong>
            <span class="sounding-tank-meta">${tank.tank_code} | ${tank.capacity_cbm} m³</span>
          </div>
          <div class="sounding-inputs">
            <div class="form-group">
              <label>Sounding (mm)</label>
              <input type="number" class="sounding-mm" data-tank-id="${tank.id}" data-capacity="${tank.capacity_cbm}" 
                     step="1" min="0" placeholder="e.g. 3500" oninput="resources.calculateMT(this)">
            </div>
            <div class="form-group">
              <label>Density (kg/m³)</label>
              <input type="number" class="sounding-density" value="${tank.density_default || 890}" step="0.1">
            </div>
            <div class="form-group">
              <label>Temp (°C)</label>
              <input type="number" class="sounding-temp" value="40" step="0.1">
            </div>
            <div class="form-group">
              <label>Calc. MT</label>
              <input type="text" class="sounding-calc-mt" readonly value="-" style="background:#2a2f4a;">
            </div>
          </div>
        </div>
      `).join('');

      document.getElementById('fuelSoundingTanks').innerHTML = html;
      ui.showModal('fuelSoundingModal');
    } catch (err) {
      Utils.showNotification(`Error loading tanks: ${err.message}`, 'error');
    }
  }

  calculateMT(input) {
    const row = input.closest('.sounding-row');
    const soundingMm = parseFloat(row.querySelector('.sounding-mm').value) || 0;
    const density = parseFloat(row.querySelector('.sounding-density').value) || 890;
    const capacity = parseFloat(input.dataset.capacity) || 0;

    // Simplified calculation: (sounding_mm / 1000) * capacity_cbm * density / 1000
    const mt = (soundingMm / 1000) * capacity * density / 1000;
    row.querySelector('.sounding-calc-mt').value = mt.toFixed(2) + ' MT';
  }

  async handleSubmitFuelSounding(event) {
    event.preventDefault();
    const reportId = document.getElementById('fuelReportId').value;
    const notes = document.getElementById('fuelSoundingNotes').value;

    const rows = document.querySelectorAll('.sounding-row');
    const soundings = [];

    rows.forEach(row => {
      const mmInput = row.querySelector('.sounding-mm');
      const soundingMm = parseFloat(mmInput.value);

      if (soundingMm > 0) {
        soundings.push({
          tank_id: parseInt(mmInput.dataset.tankId),
          sounding_mm: soundingMm,
          capacity_cbm: parseFloat(mmInput.dataset.capacity) || 0,
          density_kg_cbm: parseFloat(row.querySelector('.sounding-density').value) || 890,
          temperature_celsius: parseFloat(row.querySelector('.sounding-temp').value) || 40,
          remarks: ''
        });
      }
    });

    if (soundings.length === 0) {
      Utils.showNotification('Please enter at least one sounding measurement', 'error');
      return;
    }

    try {
      await API.resources.submitFuelSounding(reportId, soundings, notes);
      Utils.showNotification(`✅ Fuel sounding submitted: ${soundings.length} tanks`, 'success');
      ui.closeModal('fuelSoundingModal');
      this.loadMyReports();
    } catch (err) {
      Utils.showNotification(`Error: ${err.message}`, 'error');
    }
  }

  // ==========================================
  // TAB 3: TRENDS (SVG Charts)
  // ==========================================
  async loadTrendsOverview() {
    const container = document.getElementById('trendsContainer');
    if (!container) return;

    try {
      const inventory = this.inventory.length ? this.inventory : await API.resources.getInventory();

      let html = '<div class="trends-grid">';
      inventory.forEach(item => {
        const pct = item.percentage || 0;
        const barColor = item.status === 'critical' ? '#ef4444' :
                         item.status === 'warning' ? '#f59e0b' :
                         item.status === 'optimal' ? '#10b981' : '#3b82f6';

        html += `
          <div class="trend-card" onclick="resources.loadTrendChart(${item.id}, '${item.name}')">
            <div class="trend-card-name">${item.name}</div>
            <svg width="100%" height="40" viewBox="0 0 200 40" preserveAspectRatio="none">
              <rect x="0" y="0" width="200" height="40" fill="#1a1f3a" rx="4"/>
              <rect x="0" y="0" width="${pct * 2}" height="40" fill="${barColor}" rx="4" opacity="0.7"/>
              <text x="100" y="25" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${pct}%</text>
            </svg>
            <div class="trend-card-level">${item.current_level} ${item.unit}</div>
          </div>
        `;
      });
      html += '</div>';

      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<p style="color:red;">Error loading trends: ${err.message}</p>`;
    }
  }

  async loadTrendChart(resourceId, resourceName) {
    try {
      const history = await API.resources.getTrends(resourceId);
      
      let chartHtml = `<h3 style="margin-bottom:15px;">📈 ${resourceName} — Consumption Trend</h3>`;

      if (!history || history.length === 0) {
        chartHtml += '<p style="color:#888;">No historical data yet. Data will appear after reports are submitted.</p>';
      } else {
        // Generate SVG line chart
        const maxLevel = Math.max(...history.map(h => h.level_after || 0), 1);
        const width = 600;
        const height = 200;
        const padding = 30;
        const chartW = width - padding * 2;
        const chartH = height - padding * 2;

        let points = history.reverse().map((h, i) => {
          const x = padding + (i / Math.max(history.length - 1, 1)) * chartW;
          const y = padding + chartH - ((h.level_after || 0) / maxLevel) * chartH;
          return `${x},${y}`;
        }).join(' ');

        chartHtml += `
          <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="background:#1a1f3a; border-radius:8px;">
            <!-- Grid lines -->
            <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#333" stroke-width="1"/>
            <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#333" stroke-width="1"/>
            <!-- Data line -->
            <polyline fill="none" stroke="#3b82f6" stroke-width="2" points="${points}"/>
            <!-- Data points -->
            ${history.map((h, i) => {
              const x = padding + (i / Math.max(history.length - 1, 1)) * chartW;
              const y = padding + chartH - ((h.level_after || 0) / maxLevel) * chartH;
              return `<circle cx="${x}" cy="${y}" r="4" fill="#3b82f6"/>`;
            }).join('')}
            <!-- Y axis labels -->
            <text x="5" y="${padding + 5}" fill="#888" font-size="10">${maxLevel}</text>
            <text x="5" y="${height - padding + 5}" fill="#888" font-size="10">0</text>
          </svg>
        `;

        // History table
        chartHtml += '<div class="trend-history-table" style="margin-top:15px;">';
        history.reverse().forEach(h => {
          chartHtml += `
            <div class="trend-row">
              <span>${h.change_reason || '-'}</span>
              <span>${h.level_before || '?'} → ${h.level_after || '?'}</span>
              <span>${h.recorded_by_name || '-'}</span>
              <span>${Utils.formatTime(h.recorded_at)}</span>
            </div>
          `;
        });
        chartHtml += '</div>';
      }

      document.getElementById('trendChartContent').innerHTML = chartHtml;
      ui.showModal('trendChartModal');
    } catch (err) {
      Utils.showNotification(`Error: ${err.message}`, 'error');
    }
  }

  // ==========================================
  // TAB 4: ASSIGN REPORTS (Chief only)
  // ==========================================
  async loadAssignForm() {
    const container = document.getElementById('assignFormContainer');
    if (!container) return;

    try {
      const [crew, inventory] = await Promise.all([
        API.chief.getCrew(),
        API.resources.getInventory()
      ]);

      const crewOptions = crew.map(c => `<option value="${c.id}">${c.name} (${c.crew_number || '-'})</option>`).join('');
      const resourceOptions = inventory.map(r => `<option value="${r.id}">${r.name} (${r.category})</option>`).join('');

      container.innerHTML = `
        <form onsubmit="resources.handleAssignReport(event)" class="assign-form card">
          <h3>✍️ Assign New Inventory Report</h3>

          <div class="form-group">
            <label>Assign To *</label>
            <select id="assignCrewId" required>${crewOptions}</select>
          </div>

          <div class="form-group">
            <label>Report Type *</label>
            <select id="assignReportType" required>
              <option value="fuel_sounding">⛽ Fuel Sounding</option>
              <option value="lube_oil_check">🛢️ Lube Oil Check</option>
              <option value="hydraulic_check">💧 Hydraulic Check</option>
              <option value="water_treatment_check">🌊 Water Treatment</option>
              <option value="gas_bottles_count">🔋 Gas Bottles Count</option>
              <option value="chemicals_stock">🧪 Chemicals Stock</option>
            </select>
          </div>

          <div class="form-group">
            <label>Resource *</label>
            <select id="assignResourceId" required>${resourceOptions}</select>
          </div>

          <div class="form-group">
            <label>Due Date *</label>
            <input type="date" id="assignDueDate" required>
          </div>

          <button type="submit" class="btn-primary btn-block">📋 Assign Report</button>
        </form>

        <div style="margin-top:20px;">
          <h3>Active Assignments</h3>
          <div id="activeAssignmentsList">Loading...</div>
        </div>
      `;

      // Set default due date to 7 days from now
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      document.getElementById('assignDueDate').value = dueDate.toISOString().split('T')[0];

      // Load active assignments
      this.loadActiveAssignments();
    } catch (err) {
      container.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
  }

  async loadActiveAssignments() {
    try {
      const assignments = await API.chief.getAssignments();
      const container = document.getElementById('activeAssignmentsList');
      if (!container) return;

      if (assignments.length === 0) {
        container.innerHTML = '<p style="color:#888;">No active assignments.</p>';
        return;
      }

      container.innerHTML = assignments.map(a => `
        <div class="assignment-row">
          <span><strong>${a.crew_member_name}</strong></span>
          <span>${a.report_type}</span>
          <span>${a.resource_name || '-'}</span>
          <span>${a.frequency}</span>
        </div>
      `).join('');
    } catch (err) {
      console.error('Error loading assignments:', err);
    }
  }

  async handleAssignReport(event) {
    event.preventDefault();

    const crewId = document.getElementById('assignCrewId').value;
    const reportType = document.getElementById('assignReportType').value;
    const resourceId = document.getElementById('assignResourceId').value;
    const dueDate = document.getElementById('assignDueDate').value;

    try {
      await API.chief.assignReport(crewId, reportType, resourceId, dueDate);
      Utils.showNotification('✅ Report assigned successfully!', 'success');
      this.loadAssignForm(); // Refresh the form
    } catch (err) {
      Utils.showNotification(`Error: ${err.message}`, 'error');
    }
  }

  // ==========================================
  // TAB 5: VERIFY REPORTS (Chief only)
  // ==========================================
  async loadAllReports() {
    try {
      this.allReports = await API.chief.getAllReports();
      this.renderAllReports();
    } catch (err) {
      Utils.showNotification(`Error loading reports: ${err.message}`, 'error');
    }
  }

  renderAllReports() {
    const container = document.getElementById('verifyReportsList');
    if (!container) return;

    if (this.allReports.length === 0) {
      container.innerHTML = '<p style="color:#888; text-align:center; padding:40px;">No reports found.</p>';
      return;
    }

    const html = this.allReports.map(report => {
      const statusClass = report.actual_status || report.status;
      const canVerify = report.status === 'submitted';

      return `
        <div class="report-card report-${statusClass}">
          <div class="report-card-header">
            <span class="report-type">${report.report_type}</span>
            <span class="report-status badge-${statusClass}">${(report.actual_status || report.status).toUpperCase()}</span>
          </div>
          <div class="report-card-body">
            <div>Resource: <strong>${report.resource_name || '-'}</strong></div>
            <div>Assigned to: <strong>${report.assigned_to_name || '-'}</strong></div>
            <div>Due: ${report.due_date || '-'}</div>
            ${report.submitted_date ? `<div>Submitted: ${Utils.formatTime(report.submitted_date)}</div>` : ''}
            ${report.submission_notes ? `<div>Notes: <em>${report.submission_notes}</em></div>` : ''}
          </div>
          ${canVerify ? `
            <div class="report-card-actions">
              <button onclick="resources.verifyReport(${report.id}, true)" class="btn-primary" style="margin-right:8px;">✅ Verify</button>
              <button onclick="resources.verifyReport(${report.id}, false)" class="btn-danger">❌ Reject</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  async verifyReport(reportId, verified) {
    const notes = verified ? '' : prompt('Reason for rejection:');
    if (!verified && notes === null) return; // User cancelled

    try {
      await API.chief.verifyReport(reportId, verified, notes || '');
      Utils.showNotification(`Report ${verified ? 'verified' : 'rejected'}`, 'success');
      this.loadAllReports();
    } catch (err) {
      Utils.showNotification(`Error: ${err.message}`, 'error');
    }
  }

  // ==========================================
  // AUTO REFRESH
  // ==========================================
  startAutoRefresh() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.refreshInterval = setInterval(() => {
      if (app.currentPage === ROUTES.RESOURCES) {
        if (this.currentTab === 'inventory') this.loadInventory();
      }
    }, CONFIG.REFRESH.RESOURCES || 30000);
  }

  destroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }
}

window.resources = new ResourcesModule();
