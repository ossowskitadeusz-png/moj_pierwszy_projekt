const chat = {
  activeChatUser: null,
  refreshInterval: null,

  async load() {
    try {
      const team = await API.getTeam();
      const html = team.map(u => `
        <div class="user-item ${this.activeChatUser === u.id ? 'active' : ''}" onclick="chat.selectUser(${u.id}, '${u.name}')">
          <div class="user-avatar" style="width:30px; height:30px; font-size:0.8rem;">${u.name[0].toUpperCase()}</div>
          <div style="flex:1;">
            <p style="font-size:0.9rem;">${u.name}</p>
            <small style="color:var(--text-muted); font-size:0.7rem;">${u.role}</small>
          </div>
          <span class="status-dot" style="background:${u.status === 'online' ? 'var(--accent-success)' : '#555'}"></span>
        </div>
      `).join('');
      
      document.getElementById('usersList').innerHTML = html;

      if (!this.refreshInterval) {
        this.refreshInterval = setInterval(() => {
          if (app.currentPage === ROUTES.CHAT && this.activeChatUser) {
            this.loadMessages();
          }
        }, CONFIG.REFRESH.MESSAGES);
      }
    } catch (err) {
      console.error('Błąd ładowania zespołu:', err);
    }
  },

  async selectUser(userId, userName) {
    this.activeChatUser = userId;
    document.getElementById('chatHeader').innerHTML = `<p>Rozmowa z <strong>${userName}</strong></p>`;
    document.getElementById('messageForm').style.display = 'flex';
    this.load(); // Refresh user list highlight
    this.loadMessages();
  },

  async loadMessages() {
    if (!this.activeChatUser) return;
    try {
      const messages = await API.getMessages(this.activeChatUser);
      const html = messages.map(m => `
        <div class="message ${m.from_user_id === app.currentUser.id ? 'sent' : 'received'}">
          <p>${m.content}</p>
          <small style="display:block; text-align:right; font-size:0.6rem; opacity:0.7; margin-top:4px;">
            ${new Date(m.created_at).toLocaleTimeString('pl-PL', {hour:'2-digit', minute:'2-digit'})}
          </small>
        </div>
      `).join('');
      
      const container = document.getElementById('chatMessages');
      const shouldScroll = container.scrollTop + container.clientHeight === container.scrollHeight;
      container.innerHTML = html || '<p class="placeholder" style="text-align:center; margin-top:20px;">Brak wiadomości. Wyślij pierwszą!</p>';
      
      if (shouldScroll || !container.dataset.scrolled) {
        container.scrollTop = container.scrollHeight;
        container.dataset.scrolled = "true";
      }
    } catch (err) {
      console.error('Błąd ładowania wiadomości:', err);
    }
  }
};

document.getElementById('messageForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('messageInput');
  const content = input.value.trim();
  if (!content || !chat.activeChatUser) return;

  try {
    await API.sendMessage(chat.activeChatUser, content);
    input.value = '';
    chat.loadMessages();
  } catch (err) {
    alert('Błąd wysyłania: ' + err.message);
  }
});
