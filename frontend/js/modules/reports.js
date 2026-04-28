class Reports {
  constructor() {
    this.myReports = [];
    this.allReports = [];
    this.currentReportId = null;
    this.currentFilter = { status: '', type: '' };
    this.selectedFile = null;
    this.currentTab = 'my-reports';
  }

  async load() {
    console.log('📊 Loading Reports Module...');
    
    // Pokaż odpowiednie zakładki
    const isChief = app.currentUser.role === 'chief_engineer';
    document.getElementById('allReportsTab').style.display = isChief ? 'block' : 'none';
    document.getElementById('generateTab').style.display = isChief ? 'block' : 'none';

    // Load data
    await this.loadMyReports();
    if (isChief) {
      await this.loadAllReports();
      this.updateGenerateStats();
    }

    this.setupEventListeners();
  }

  async loadMyReports() {
    try {
      this.myReports = await API.request('/resources/reports/my');
      this.renderMyReports();
    } catch (err) {
      console.error('Error loading reports:', err);
    }
  }

  async loadAllReports() {
    try {
      this.allReports = await API.reports.getAllReports();
      this.renderAllReports();
    } catch (err) {
      console.error('Error loading all reports:', err);
    }
  }

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('#reportsPage .tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`#reportsPage .tab-btn[onclick="reports.switchTab('${tab}')"]`);
    if (activeBtn) activeBtn.classList.add('active');

    document.querySelectorAll('#reportsPage .tab-content').forEach(tc => tc.style.display = 'none');
    
    if (tab === 'my-reports') {
      document.getElementById('myReportsTab').style.display = 'block';
    } else if (tab === 'all-reports') {
      document.getElementById('allReportsTabContent').style.display = 'block';
      this.loadAllReports();
    } else if (tab === 'generate') {
      document.getElementById('generateTabContent').style.display = 'block';
      this.updateGenerateStats();
    }
  }

  renderMyReports() {
    const filtered = this.myReports.filter(r => {
      const statusMatch = !this.currentFilter.status || r.actual_status === this.currentFilter.status;
      const typeMatch = !this.currentFilter.type || r.report_type === this.currentFilter.type;
      return statusMatch && typeMatch;
    });

    const html = filtered.map(report => {
      return `
        <div class="report-card">
          <div class="report-card-header">
            <div class="report-card-title">
              <span class="report-card-type">${report.report_type.replace(/_/g, ' ')}</span>
              <h4>${report.resource_name || 'General Report'}</h4>
            </div>
            <span class="report-status-badge ${report.actual_status}">
              ${report.actual_status.toUpperCase()}
            </span>
          </div>

          <div class="report-card-details">
            <div class="report-detail-item">
              <span class="report-detail-label">Due Date</span>
              <span class="report-detail-value">${utils.formatDate(report.due_date)}</span>
            </div>
            <div class="report-detail-item">
              <span class="report-detail-label">Assigned By</span>
              <span class="report-detail-value">${report.assigned_by_name || 'Chief Engineer'}</span>
            </div>
            ${report.submitted_date ? `
              <div class="report-detail-item">
                <span class="report-detail-label">Submitted</span>
                <span class="report-detail-value">${utils.formatTime(report.submitted_date)}</span>
              </div>
            ` : ''}
          </div>

          <div class="report-card-actions">
            <button onclick="reports.downloadTemplate(${report.id})" class="btn-sm primary">
              📥 Download Template
            </button>
            ${report.actual_status === 'pending' || report.actual_status === 'rejected' ? `
              <button onclick="reports.showUploadModal(${report.id})" class="btn-sm">
                📤 Upload Excel
              </button>
            ` : ''}
            <button onclick="reports.showReportDetail(${report.id})" class="btn-sm">
              👁️ View Details
            </button>
          </div>
        </div>
      `;
    }).join('');

    const container = document.getElementById('myReportsList');
    if (container) {
      container.innerHTML = html || '<p style="color: #888; text-align: center; padding: 40px;">No reports assigned</p>';
    }
  }

  renderAllReports() {
    const tbody = document.getElementById('allReportsBody');
    if (!tbody) return;

    tbody.innerHTML = this.allReports.map(report => `
      <tr>
        <td><strong>#${report.id}</strong></td>
        <td>${report.report_type.replace(/_/g, ' ')}</td>
        <td>${report.assigned_to_name || '-'}</td>
        <td>${utils.formatDate(report.due_date)}</td>
        <td>${report.submitted_date ? utils.formatDate(report.submitted_date) : '-'}</td>
        <td>
          <span class="report-status-badge ${report.actual_status}">
            ${report.actual_status.toUpperCase()}
          </span>
        </td>
        <td>
          ${report.status === 'submitted' ? `
            <button onclick="reports.showVerifyModal(${report.id})" class="btn-sm primary">
              ✅ Verify
            </button>
          ` : ''}
          <button onclick="reports.showReportDetail(${report.id})" class="btn-sm">
            👁️ View
          </button>
        </td>
      </tr>
    `).join('');
  }

  filterByStatus(status) {
    this.currentFilter.status = status;
    this.renderMyReports();
  }

  filterByType(type) {
    this.currentFilter.type = type;
    this.renderMyReports();
  }

  filterAllReports() {
    const crewFilter = document.getElementById('crewFilter').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    
    // Logic for filtering allReports and re-rendering
    const filtered = this.allReports.filter(r => {
      const crewMatch = !crewFilter || r.assigned_to_name.toLowerCase().includes(crewFilter);
      const statusMatch = !statusFilter || r.actual_status === statusFilter;
      return crewMatch && statusMatch;
    });

    const tbody = document.getElementById('allReportsBody');
    tbody.innerHTML = filtered.map(report => `
      <tr>
        <td><strong>#${report.id}</strong></td>
        <td>${report.report_type.replace(/_/g, ' ')}</td>
        <td>${report.assigned_to_name || '-'}</td>
        <td>${utils.formatDate(report.due_date)}</td>
        <td>${report.submitted_date ? utils.formatDate(report.submitted_date) : '-'}</td>
        <td>
          <span class="report-status-badge ${report.actual_status}">
            ${report.actual_status.toUpperCase()}
          </span>
        </td>
        <td>
          ${report.status === 'submitted' ? `
            <button onclick="reports.showVerifyModal(${report.id})" class="btn-sm primary">
              ✅ Verify
            </button>
          ` : ''}
          <button onclick="reports.showReportDetail(${report.id})" class="btn-sm">
            👁️ View
          </button>
        </td>
      </tr>
    `).join('');
  }

  // ===== DOWNLOAD TEMPLATE =====
  downloadTemplate(reportId) {
    utils.showNotification('Downloading Excel template...', 'info');
    API.reports.downloadTemplate(reportId);
  }

  // ===== UPLOAD MODAL =====
  showUploadModal(reportId) {
    this.currentReportId = reportId;
    this.selectedFile = null;
    
    document.getElementById('fileInput').value = '';
    document.getElementById('uploadStatus').innerHTML = '';
    document.getElementById('uploadBtn').style.display = 'none';

    ui.showModal('uploadModal');
    this.setupDragAndDrop();
  }

  setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    
    // Prevent default behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    dropZone.addEventListener('dragover', () => dropZone.classList.add('dragover'));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
      dropZone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleFileSelected(files[0]);
      }
    });
  }

  handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
      this.handleFileSelected(files[0]);
    }
  }

  handleFileSelected(file) {
    const allowed = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    
    if (!allowed.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      utils.showNotification('Only Excel files allowed (.xlsx, .xls)', 'error');
      return;
    }

    this.selectedFile = file;
    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.innerHTML = `
      <div style="padding: 10px; background: rgba(46, 204, 113, 0.2); border: 1px solid #2ecc71; color: #2ecc71; border-radius: 4px;">
        ✅ File selected: <strong>${file.name}</strong>
      </div>
    `;

    document.getElementById('uploadBtn').style.display = 'block';
  }

  async submitReport() {
    if (!this.selectedFile || !this.currentReportId) return;

    const btn = document.getElementById('uploadBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Uploading...';

    try {
      const response = await API.reports.uploadReport(this.currentReportId, this.selectedFile);
      utils.showNotification(`✅ Report uploaded successfully!`, 'success');
      ui.closeModal('uploadModal');
      await this.loadMyReports();
    } catch (err) {
      utils.showNotification(`Upload failed: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '📤 Upload Report';
    }
  }

  // ===== VERIFY MODAL =====
  showVerifyModal(reportId) {
    const report = this.allReports.find(r => r.id === reportId);
    if (!report) return;

    this.currentReportId = reportId;
    document.getElementById('verifyReportInfo').innerHTML = `
      <strong>Report:</strong> ${report.report_type.replace(/_/g, ' ')}<br>
      <strong>Crew:</strong> ${report.assigned_to_name}<br>
      <strong>Submitted:</strong> ${utils.formatDate(report.submitted_date)}
    `;
    
    document.getElementById('verifyNotes').value = '';
    ui.showModal('verifyModal');
  }

  async handleVerify(event) {
    event.preventDefault();
    const verdict = document.querySelector('input[name="verdict"]:checked').value === 'true';
    const notes = document.getElementById('verifyNotes').value;

    try {
      await API.reports.verifyReport(this.currentReportId, verdict, notes);
      utils.showNotification(verdict ? '✅ Report Approved' : '❌ Report Rejected', 'success');
      ui.closeModal('verifyModal');
      await this.loadAllReports();
    } catch (err) {
      utils.showNotification(`Error: ${err.message}`, 'error');
    }
  }

  async showReportDetail(reportId) {
    try {
      const report = await API.resources.getReportDetail(reportId);
      
      let html = `
        <h3>Report Details #${report.id}</h3>
        <div class="report-summary">
          <div class="report-summary-row">
            <span class="report-summary-label">Type:</span>
            <span class="report-summary-value">${report.report_type.replace(/_/g, ' ')}</span>
          </div>
          <div class="report-summary-row">
            <span class="report-summary-label">Status:</span>
            <span class="report-summary-value">${report.status.toUpperCase()}</span>
          </div>
          <div class="report-summary-row">
            <span class="report-summary-label">Assigned To:</span>
            <span class="report-summary-value">${report.assigned_to_name}</span>
          </div>
           <div class="report-summary-row">
            <span class="report-summary-label">Due Date:</span>
            <span class="report-summary-value">${utils.formatDate(report.due_date)}</span>
          </div>
        </div>
      `;

      if (report.readings) {
        const readings = JSON.parse(report.readings);
        html += '<h4>Extracted Data</h4><div class="readings-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; background:rgba(0,0,0,0.2); padding:10px; border-radius:5px;">';
        for (const [key, val] of Object.entries(readings)) {
          html += `<div><strong>${key}:</strong></div><div>${val}</div>`;
        }
        html += '</div>';
      }

      document.getElementById('reportDetailContent').innerHTML = html;
      ui.showModal('reportDetailModal');
    } catch (err) {
      utils.showNotification(`Error: ${err.message}`, 'error');
    }
  }

  async updateGenerateStats() {
    try {
      const reports = this.allReports.length ? this.allReports : await API.reports.getAllReports();
      const stats = {
        pending: reports.filter(r => r.actual_status === 'pending').length,
        submitted: reports.filter(r => r.actual_status === 'submitted').length,
        verified: reports.filter(r => r.actual_status === 'verified').length,
        overdue: reports.filter(r => r.actual_status === 'overdue').length
      };

      document.getElementById('genStatPending').textContent = stats.pending;
      document.getElementById('genStatSubmitted').textContent = stats.submitted;
      document.getElementById('genStatVerified').textContent = stats.verified;
      document.getElementById('genStatOverdue').textContent = stats.overdue;
    } catch (err) {
      console.error('Error updating stats:', err);
    }
  }

  async generateMonthlyReport() {
    const month = document.getElementById('reportMonth').value;
    if (!month) {
      utils.showNotification('Please select a month', 'warning');
      return;
    }

    try {
      utils.showNotification('Generating monthly report...', 'info');
      await API.reports.generateMonthlyReport(month);
      utils.showNotification('✅ Monthly report generated! Check your downloads.', 'success');
    } catch (err) {
      utils.showNotification(`Error: ${err.message}`, 'error');
    }
  }

  setupEventListeners() {
    // Already handled by inline onclicks for simplicity in this case
  }
}

window.reports = new Reports();
