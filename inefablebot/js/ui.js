/**
 * ui.js — Manejo de la tabla (Grid.js) y la interfaz del Chat
 */
const UI = {

  /* ── STATE ── */
  _grid: null,
  _allData: [],
  _headers: [],
  _currentTab: 'sheet',
  _sending: false,
  _chatHistory: [], // Para contexto de la IA
  _configOpen: false,

  /* ═══════════════════════════
     TABLA
  ═══════════════════════════ */

  renderTable(data) {
    this._allData = data;
    this._headers = Utils.getHeaders(data);

    const container = document.getElementById('table-container');
    const skeleton  = document.getElementById('skeleton-wrapper');
    const empty     = document.getElementById('empty-state');

    skeleton.style.display = 'none';

    if (!data || data.length === 0) {
      container.style.display = 'none';
      empty.style.display = 'flex';
      return;
    }

    container.style.display = 'block';
    empty.style.display = 'none';

    // Construir columnas dinámicamente
    const columns = this._headers.map(header => ({
      id: header,
      name: header,
      sort: true,
      formatter: (cell) => this._cellFormatter(header, cell)
    }));

    // Convertir a array de arrays para Grid.js
    const rows = data.map(row => this._headers.map(h => row[h] ?? ''));

    // Destruir grid previo si existe
    if (this._grid) {
      this._grid.destroy();
      container.innerHTML = '';
    }

    this._grid = new gridjs.Grid({
      columns,
      data: rows,
      pagination: { limit: 20 },
      sort: true,
      resizable: true,
      style: {
        table: { 'width': '100%' }
      },
      language: {
        search: { placeholder: 'Buscar…' },
        pagination: {
          previous: '← Ant',
          next: 'Sig →',
          showing: 'Mostrando',
          results: () => 'registros',
          of: 'de',
          to: 'a',
        },
        loading: 'Cargando…',
        noRecordsFound: 'Sin resultados',
        error: 'Error al cargar datos',
      }
    }).render(container);

    // Actualizar contador
    document.getElementById('row-count').textContent = `${data.length} filas`;
  },

  renderSheetTabs(tabs, activeTab) {
    const container = document.getElementById('sheet-tabs-container');
    container.innerHTML = '';

    tabs.forEach(tab => {
      const btn = document.createElement('button');
      btn.className = `sheet-tab ${tab === activeTab ? 'active' : ''}`;
      btn.textContent = tab;
      btn.onclick = () => App.switchSheetTab(tab);
      container.appendChild(btn);
    });
  },

  _cellFormatter(header, value) {
    const type = Utils.detectType(header, value);
    const v = value ?? '';

    switch (type) {
      case 'empty':
        return gridjs.html(`<span style="opacity:0.3">—</span>`);
      case 'currency':
        return gridjs.html(`<span style="color:#10b981;font-weight:600">${Utils.formatCurrency(v)}</span>`);
      case 'date':
        return gridjs.html(`<span style="color:#a09db8">${Utils.formatDate(v)}</span>`);
      case 'status':
        return gridjs.html(Utils.renderStatusBadge(v));
      case 'phone':
        return gridjs.html(`<a href="tel:${v}" style="color:#3b82f6;text-decoration:none">${v}</a>`);
      case 'email':
        return gridjs.html(`<a href="mailto:${v}" style="color:#3b82f6;text-decoration:none">${v}</a>`);
      default:
        return gridjs.html(`<span title="${Utils.escapeHtml(String(v))}">${Utils.escapeHtml(Utils.truncate(String(v)))}</span>`);
    }
  },

  filterTable(query) {
    if (!query.trim()) {
      this.renderTable(this._allData);
      return;
    }
    const q = query.toLowerCase();
    const filtered = this._allData.filter(row =>
      Object.values(row).some(v => String(v).toLowerCase().includes(q))
    );
    this.renderTable(filtered);
    // Restore full data reference
    this._allData = App.state.data;
  },

  showSkeleton() {
    document.getElementById('skeleton-wrapper').style.display = 'block';
    document.getElementById('table-container').style.display = 'none';
    document.getElementById('empty-state').style.display = 'none';
  },

  showError(msg) {
    const empty = document.getElementById('empty-state');
    document.getElementById('skeleton-wrapper').style.display = 'none';
    document.getElementById('table-container').style.display = 'none';
    document.getElementById('empty-message').textContent = msg;
    empty.style.display = 'flex';
  },

  /* ═══════════════════════════
     CHAT
  ═══════════════════════════ */

  async sendMessage(event) {
    event.preventDefault();
    if (this._sending) return;

    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    // Limpiar input
    input.value = '';
    input.style.height = 'auto';

    // Mostrar mensaje del usuario
    this.appendMessage('user', text);
    this._chatHistory.push({ role: 'user', content: text });

    // Bloquear envío
    this._sending = true;
    document.getElementById('btn-send').disabled = true;

    // Mostrar indicador de escritura
    const typingId = this.showTyping();

    try {
      // Enviamos el historial y los datos actuales para que la IA "sepa" qué hay en el sheet
      const result = await ApiClient.sendChat(this._chatHistory, UI._headers, this._allData);
      this.removeTyping(typingId);

      if (result.ok) {
        const reply = result.reply;
        this.appendMessage('bot', reply);
        this._chatHistory.push({ role: 'assistant', content: reply });

        // Si la IA devolvió un tool call, ejecutarlo
        if (result.toolCall) {
          await this._executeToolCall(result.toolCall);
        }
      } else {
        this.appendMessage('bot', `❌ Error: ${result.error}`);
      }
    } catch (err) {
      this.removeTyping(typingId);
      this.appendMessage('bot', `❌ Error inesperado: ${err.message}`);
    }

    this._sending = false;
    document.getElementById('btn-send').disabled = false;
    input.focus();
  },

  appendMessage(role, text) {
    const container = document.getElementById('chat-messages');
    const isBot = role === 'bot';

    const div = document.createElement('div');
    div.className = `message message-${isBot ? 'bot' : 'user'}`;
    div.innerHTML = `
      ${isBot ? '<img src="../inefableinfo/img/logo.png" alt="Bot" class="message-avatar" />' : '<div class="message-avatar">👤</div>'}
      <div class="message-bubble">
        ${Utils.markdownToHtml(text)}
      </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  showTyping() {
    const id = `typing-${Utils.uid()}`;
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'message message-bot';
    div.id = id;
    div.innerHTML = `
      <img src="../inefableinfo/img/logo.png" alt="Bot" class="message-avatar" />
      <div class="message-bubble">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
  },

  removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  },

  async _executeToolCall(toolCall) {
    const activeTab = App.state.currentTab;

    if (toolCall.name === 'editar_cliente') {
      const { fila, columna, nuevo_valor } = toolCall.parameters;
      const result = await ApiClient.updateCell(fila, columna, nuevo_valor, activeTab);
      if (result.ok) {
        UI.showToast(`✏️ Fila ${fila}: ${columna} → "${nuevo_valor}"`, 'success');
        await App.reload();
      } else {
        UI.showToast(`Error al editar: ${result.error}`, 'error');
      }
    } 
    
    if (toolCall.name === 'crear_registro') {
      const { datos } = toolCall.parameters;
      const result = await ApiClient.addRow(datos, activeTab);
      if (result.ok) {
        UI.showToast(`✅ Registro creado al final (Fila ${result.fila})`, 'success');
        await App.reload();
      } else {
        UI.showToast(`Error al crear: ${result.error}`, 'error');
      }
    }
  },

  handleInputKey(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      document.getElementById('chat-form').dispatchEvent(new Event('submit'));
    }
  },

  autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  },

  updateWelcomeMessage(headers) {
    const el = document.getElementById('welcome-message');
    if (!el) return;
    const cols = headers.length ? headers.join(', ') : '…';
    el.querySelector('.message-bubble').innerHTML = `
      <p>¡Hola! Soy <strong>InefableBot</strong>. Puedo consultar y editar tu Seguimiento Sheet con lenguaje natural.</p>
      <p style="margin-top:8px; font-size:0.82em; opacity:0.7">📊 Columnas detectadas: <code>${cols}</code></p>
    `;
  },

  /* ═══════════════════════════
     TABS MOBILE
  ═══════════════════════════ */

  switchTab(tab) {
    this._currentTab = tab;
    const main = document.getElementById('app-main');
    main.classList.toggle('show-chat', tab === 'bot');

    document.getElementById('tab-sheet').classList.toggle('active', tab === 'sheet');
    document.getElementById('tab-bot').classList.toggle('active', tab === 'bot');

    if (tab === 'bot') {
      setTimeout(() => {
        const msgs = document.getElementById('chat-messages');
        msgs.scrollTop = msgs.scrollHeight;
        document.getElementById('chat-input').focus();
      }, 350);
    }
  },

  /* ═══════════════════════════
     STATUS
  ═══════════════════════════ */

  setStatus(state, text) {
    const dot  = document.getElementById('status-dot');
    const span = document.getElementById('status-text');
    dot.className = `status-dot ${state}`;
    span.textContent = text;
  },

  setModelBadge(text) {
    document.getElementById('model-badge').textContent = text;
  },

  /* ═══════════════════════════
     TOAST NOTIFICATIONS
  ═══════════════════════════ */

  showToast(msg, type = 'info') {
    const icons = { success: '✅', error: '❌', info: '💡' };
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || '📌'}</span><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('removing');
      toast.addEventListener('animationend', () => toast.remove());
    }, 4000);
  },

  /* ═══════════════════════════
     CONFIG MODAL
  ═══════════════════════════ */

  toggleConfig() {
    this._configOpen = !this._configOpen;
    const modal = document.getElementById('config-modal');
    modal.style.display = this._configOpen ? 'flex' : 'none';

    if (this._configOpen) {
      // Cargar valores actuales
      document.getElementById('cfg-worker-url').value = Utils.load('workerUrl', '');
      document.getElementById('cfg-demo-mode').checked = Utils.load('demoMode', true);
    }
  },

  closeConfigOnOverlay(event) {
    if (event.target.id === 'config-modal') this.toggleConfig();
  },

  hideEditToast() {
    document.getElementById('edit-toast').style.display = 'none';
  },

  /* ═══════════════════════════
     TEMA CLARO / OSCURO
  ═══════════════════════════ */

  toggleTheme() {
    const html = document.documentElement;
    const isLight = html.getAttribute('data-theme') === 'light';

    if (isLight) {
      html.removeAttribute('data-theme');
      localStorage.setItem('inefable-theme', 'dark');
      this.showToast('🌙 Modo oscuro activado', 'info');
    } else {
      html.setAttribute('data-theme', 'light');
      localStorage.setItem('inefable-theme', 'light');
      this.showToast('☀️ Modo claro activado', 'info');
    }
  }
};

window.UI = UI;
