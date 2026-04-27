class CrewManagement {
  constructor() {
    this.crew = [];
    this.sectors = [];
    this.lastAssignment = null;
    this.draggedCrewId = null;
    this.refreshInterval = null;
  }

  async load() {
    console.log('👥 Loading Crew Management...');
    await this.refreshData();
    this.setupEventListeners();
    this.startAutoRefresh();
  }

  async refreshData() {
    try {
      this.crew = await API.chief.getCrew();
      this.sectors = await API.chief.getSectors();
      
      this.renderCrewPool();
      this.renderSectors();
    } catch (err) {
      Utils.showNotification(`Error loading crew data: ${err.message}`, 'error');
      console.error('Crew data error:', err);
    }
  }

  renderCrewPool() {
    const filteredCrew = this.crew.filter(member => {
      const searchTerm = document.getElementById('crewSearchBox')?.value.toLowerCase() || '';
      const statusFilter = document.getElementById('crewStatusFilter')?.value || '';
      
      const matchesSearch = !searchTerm || 
        member.name.toLowerCase().includes(searchTerm) ||
        (member.crew_number && member.crew_number.toLowerCase().includes(searchTerm));
      
      const matchesStatus = !statusFilter || member.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    const crewHtml = filteredCrew.map(member => `
      <div 
        class="crew-card" 
        draggable="true"
        data-crew-id="${member.id}"
        ondragstart="crewMgmt.handleDragStart(event)"
        ondragend="crewMgmt.handleDragEnd(event)"
        onclick="crewMgmt.showCrewHistory(${member.id})"
      >
        <div class="crew-card-name">
          <span class="crew-status-indicator ${member.status}"></span>
          ${member.name}
        </div>
        <div class="crew-card-meta">
          <div>Crew #: <strong>${member.crew_number || '-'}</strong></div>
          <div>Current: <strong>${member.sector_name || '🔓 Unassigned'}</strong></div>
          <div>Status: <span style="color: ${this.getStatusColor(member.status)}">${member.status.toUpperCase()}</span></div>
          <div>Certs: ${member.certifications || 'None'}</div>
        </div>
      </div>
    `).join('');

    document.getElementById('crewList').innerHTML = crewHtml || '<p>No crew members found</p>';
  }

  renderSectors() {
    const sectorsHtml = this.sectors.map(sector => {
      const assignedCrew = this.crew.filter(c => c.sector_assignment === sector.id);
      
      const crewInSectorHtml = assignedCrew.map(member => `
        <div class="crew-in-sector">
          <span>${member.name}</span>
          <button 
            class="remove-btn"
            onclick="crewMgmt.removeMemberFromSector(${member.id}, ${sector.id}); event.stopPropagation();"
          >
            Remove
          </button>
        </div>
      `).join('');

      return `
        <div 
          class="sector-dropzone sector-criticality-${sector.criticality}"
          data-sector-id="${sector.id}"
          ondragover="crewMgmt.handleDragOver(event)"
          ondragleave="crewMgmt.handleDragLeave(event)"
          ondrop="crewMgmt.handleDrop(event)"
        >
          <div class="sector-actions-menu">
            <button class="sector-action-btn edit" onclick="crewMgmt.showEditSectorModal(${sector.id}); event.stopPropagation();" title="Edit Sector">✏️ Edit</button>
            <button class="sector-action-btn delete" onclick="crewMgmt.promptDeleteSector(${sector.id}); event.stopPropagation();" title="Delete Sector">🗑️</button>
          </div>

          <div class="sector-header">
            <span class="sector-criticality ${sector.criticality}">${sector.criticality.toUpperCase()}</span>
            <div class="sector-title">🔧 ${sector.name} <span class="sector-status-badge ${sector.status}">${sector.status.toUpperCase()}</span></div>
            <div class="sector-crew-count">${assignedCrew.length} crew</div>
          </div>
          
          <div style="font-size: 12px; color: #888; margin-bottom: 10px;">
            ${sector.description || 'No description provided.'}
          </div>

          <div style="font-size: 11px; color: #666; margin-bottom: 10px;">
            Equipment: ${sector.equipment || 'Not specified'}
          </div>

          <div class="sector-crew-list">
            ${crewInSectorHtml || '<div class="sector-empty">📭 No crew assigned</div>'}
          </div>
        </div>
      `;
    }).join('');

    document.getElementById('sectorsDropZones').innerHTML = sectorsHtml;
  }

  // ===== DRAG & DROP HANDLERS =====

  handleDragStart(event) {
    const crewCard = event.target.closest('.crew-card');
    this.draggedCrewId = crewCard.dataset.crewId;
    crewCard.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', this.draggedCrewId);
  }

  handleDragEnd(event) {
    const crewCard = event.target.closest('.crew-card');
    if (crewCard) {
      crewCard.classList.remove('dragging');
    }
    this.draggedCrewId = null;
  }

  handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    const dropzone = event.currentTarget;
    dropzone.classList.add('dragover');
  }

  handleDragLeave(event) {
    const dropzone = event.currentTarget;
    if (event.currentTarget === event.target) {
      dropzone.classList.remove('dragover');
    }
  }

  async handleDrop(event) {
    event.preventDefault();
    
    const dropzone = event.currentTarget;
    dropzone.classList.remove('dragover');

    const crewId = parseInt(this.draggedCrewId);
    const sectorId = parseInt(dropzone.dataset.sectorId);

    if (!crewId || !sectorId) return;

    // Find crew and sector info
    const crew = this.crew.find(c => c.id === crewId);
    const sector = this.sectors.find(s => s.id === sectorId);

    if (!crew || !sector) return;

    try {
      Utils.showNotification(`Assigning ${crew.name} to ${sector.name}...`, 'info');

      const response = await API.chief.assignCrewToSector(crewId, sectorId);

      if (response.success) {
        this.lastAssignment = {
          crewId,
          crewName: crew.name,
          oldSector: response.oldSector,
          newSector: response.newSector,
          timestamp: new Date()
        };

        this.showUndoPanel();
        await this.refreshData();

        Utils.showNotification(`✓ ${crew.name} assigned to ${sector.name}`, 'success');
      }
    } catch (err) {
      Utils.showNotification(`Error assigning crew: ${err.message}`, 'error');
    }
  }

  // ===== SECTOR MANAGEMENT MODALS =====

  showAddSectorModal() {
    document.getElementById('addSectorForm').reset();
    ui.showModal('addSectorModal');
  }

  async handleAddSector(event) {
    event.preventDefault();
    const data = {
      name: document.getElementById('sectorName').value,
      description: document.getElementById('sectorDescription').value,
      equipment: document.getElementById('sectorEquipment').value,
      criticality: document.getElementById('sectorCriticality').value
    };

    try {
      await API.chief.createSector(data);
      Utils.showNotification('Sector created successfully', 'success');
      ui.closeModal('addSectorModal');
      this.refreshData();
    } catch (err) {
      Utils.showNotification(err.message, 'error');
    }
  }

  async showSectorTemplates() {
    try {
      const templates = await API.chief.getSectorTemplates();
      const html = templates.map(t => `
        <div class="template-card" onclick="crewMgmt.useTemplate('${t.name}', '${t.description}', '${t.equipment}', '${t.criticality}')">
          <div class="template-card-name">${t.name}</div>
          <div class="template-card-desc">${t.description}</div>
          <div class="template-card-equipment">${t.equipment}</div>
          <div class="template-card-criticality sector-criticality-${t.criticality}">${t.criticality.toUpperCase()}</div>
        </div>
      `).join('');
      document.getElementById('templatesGrid').innerHTML = html;
      ui.showModal('sectorTemplatesModal');
    } catch (err) {
      Utils.showNotification(err.message, 'error');
    }
  }

  useTemplate(name, description, equipment, criticality) {
    ui.closeModal('sectorTemplatesModal');
    document.getElementById('sectorName').value = name;
    document.getElementById('sectorDescription').value = description;
    document.getElementById('sectorEquipment').value = equipment;
    document.getElementById('sectorCriticality').value = criticality;
    ui.showModal('addSectorModal');
  }

  async showEditSectorModal(sectorId) {
    try {
      const sector = await API.chief.getSector(sectorId);
      document.getElementById('editSectorId').value = sector.id;
      document.getElementById('editSectorName').value = sector.name;
      document.getElementById('editSectorDescription').value = sector.description;
      document.getElementById('editSectorEquipment').value = sector.equipment;
      document.getElementById('editSectorCriticality').value = sector.criticality;
      document.getElementById('editSectorStatus').value = sector.status;
      ui.showModal('editSectorModal');
    } catch (err) {
      Utils.showNotification(err.message, 'error');
    }
  }

  async handleEditSector(event) {
    event.preventDefault();
    const sectorId = document.getElementById('editSectorId').value;
    const data = {
      name: document.getElementById('editSectorName').value,
      description: document.getElementById('editSectorDescription').value,
      equipment: document.getElementById('editSectorEquipment').value,
      criticality: document.getElementById('editSectorCriticality').value,
      status: document.getElementById('editSectorStatus').value
    };

    try {
      await API.chief.updateSector(sectorId, data);
      Utils.showNotification('Sector updated successfully', 'success');
      ui.closeModal('editSectorModal');
      this.refreshData();
    } catch (err) {
      Utils.showNotification(err.message, 'error');
    }
  }

  async handleDeleteSector() {
    const sectorId = document.getElementById('editSectorId').value;
    await this.promptDeleteSector(sectorId);
  }

  async promptDeleteSector(sectorId) {
    if (confirm('Are you sure you want to delete this sector? This cannot be undone.')) {
      try {
        await API.chief.deleteSector(sectorId);
        Utils.showNotification('Sector deleted successfully', 'success');
        ui.closeModal('editSectorModal');
        this.refreshData();
      } catch (err) {
        Utils.showNotification(err.error || err.message, 'error');
      }
    }
  }

  // ===== UTILITY FUNCTIONS =====

  getStatusColor(status) {
    const colors = {
      'online': '#2ecc71',
      'away': '#f39c12',
      'offline': '#e74c3c',
      'on_leave': '#9b59b6'
    };
    return colors[status] || '#888';
  }

  showUndoPanel() {
    if (!this.lastAssignment) return;

    const panel = document.getElementById('undoPanel');
    const text = document.getElementById('lastActionText');
    
    text.textContent = `${this.lastAssignment.crewName}: ${this.lastAssignment.oldSector} → ${this.lastAssignment.newSector}`;
    panel.style.display = 'flex';

    setTimeout(() => {
      panel.style.display = 'none';
    }, 8000); // Hide after 8 seconds
  }

  async undoLastAssignment() {
    if (!this.lastAssignment) return;

    try {
      const response = await API.chief.undoCrewAssignment(this.lastAssignment.crewId);
      
      if (response.success) {
        Utils.showNotification('✓ Assignment reverted', 'success');
        await this.refreshData();
        document.getElementById('undoPanel').style.display = 'none';
        this.lastAssignment = null;
      }
    } catch (err) {
      Utils.showNotification(`Undo failed: ${err.message}`, 'error');
    }
  }

  async removeMemberFromSector(crewId, sectorId) {
    if (confirm('Remove crew member from this sector?')) {
      await API.chief.assignCrewToSector(crewId, null);
      await this.refreshData();
    }
  }

  async showCrewHistory(crewId) {
    try {
      const history = await API.chief.getCrewHistory(crewId);
      
      const historyHtml = history.map(item => `
        <div class="history-item">
          <div class="history-item-action">${item.action}</div>
          <div class="history-item-details">${item.details}</div>
          <div class="history-item-time">${Utils.formatTime(item.created_at)}</div>
        </div>
      `).join('');
      
      document.getElementById('historyList').innerHTML = historyHtml || '<p>No history found</p>';
      ui.showModal('crewHistoryModal');
    } catch (err) {
      Utils.showNotification(`Error loading history: ${err.message}`, 'error');
    }
  }

  showInviteModal() {
    document.getElementById('inviteCrewForm').reset();
    ui.showModal('inviteCrewModal');
  }

  setupEventListeners() {
    // Form submit listener for invite crew is now handled inline via onsubmit="crewMgmt.handleInviteCrew(event)"
  }

  async handleInviteCrew(event) {
    event.preventDefault();
    const data = {
      name: document.getElementById('inviteName').value,
      email: document.getElementById('inviteEmail').value,
      crew_number: document.getElementById('inviteCrewNumber').value,
      phone: document.getElementById('invitePhone').value,
      certifications: document.getElementById('inviteCertifications').value
    };

    try {
      const res = await API.chief.inviteCrew(data);
      Utils.showNotification(res.message, 'success');
      ui.closeModal('inviteCrewModal');
      await this.refreshData();
    } catch (err) {
      Utils.showNotification(err.message, 'error');
    }
  }

  startAutoRefresh() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.refreshInterval = setInterval(() => {
      if (app.currentPage === ROUTES.CREW) {
        this.refreshData();
      }
    }, CONFIG.REFRESH.TEAM || 30000);
  }

  destroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }
}

window.crewMgmt = new CrewManagement();
