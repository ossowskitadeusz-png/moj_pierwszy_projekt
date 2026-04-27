const folders = {
  async load() {
    try {
      const allFolders = await API.getFolders();
      const html = allFolders.map(f => `
        <div class="folder-card" onclick="alert('Otwieranie folderu: ${f.path}')">
          <i class="fa-solid fa-folder"></i>
          <p>${f.name}</p>
          <small style="color:var(--text-muted); font-size:0.7rem;">${f.department}</small>
        </div>
      `).join('');
      
      document.getElementById('foldersList').innerHTML = html || '<p class="placeholder">Brak folderów w Twoim departamencie</p>';
    } catch (err) {
      console.error('Błąd ładowania folderów:', err);
    }
  },

  showCreateModal() {
    ui.showModal('folderModal');
  }
};

document.getElementById('createFolderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('folderName').value;
  try {
    await API.createFolder(name);
    ui.closeModal('folderModal');
    folders.load();
    e.target.reset();
  } catch (err) {
    alert('Błąd tworzenia folderu: ' + err.message);
  }
});
