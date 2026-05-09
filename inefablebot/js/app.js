/**
 * app.js — Orquestador principal de InefableBot CRM
 */
const App = {

  state: {
    data: [],
    headers: [],
    tabs: [],
    currentTab: '',
    demoMode: true,
    workerUrl: '',
  },

  /* ── INICIALIZACIÓN ── */
  async init() {
    // Cargar config guardada
    this.state.workerUrl = Utils.load('workerUrl', '');
    this.state.demoMode  = Utils.load('demoMode', true);

    // Badge modo demo / IA
    UI.setModelBadge(this.state.demoMode ? 'Modo Demo' : 'IA Activa');

    // Cargar datos iniciales
    await this.loadData();

    // Mostrar config si no hay Worker URL configurada
    if (!this.state.workerUrl && !this.state.demoMode) {
      setTimeout(() => UI.toggleConfig(), 800);
    }
  },

  /* ── CARGAR DATOS ── */
  async loadData() {
    UI.setStatus('loading', 'Sincronizando…');
    UI.showSkeleton();

    // 1. Obtener lista de tabs si no la tenemos
    if (this.state.tabs.length === 0) {
      const tabsResult = await ApiClient.fetchTabs();
      if (tabsResult.ok) {
        this.state.tabs = tabsResult.tabs;
        this.state.currentTab = this.state.tabs[0];
      }
    }

    // 2. Cargar datos del tab actual
    const result = await ApiClient.fetchData(this.state.currentTab);

    if (result.ok && result.data) {
      this.state.data    = result.data;
      this.state.headers = Utils.getHeaders(result.data);

      UI.renderSheetTabs(this.state.tabs, this.state.currentTab);
      UI.renderTable(result.data);
      UI.updateWelcomeMessage(this.state.headers);

      const modeLabel = this.state.demoMode ? 'Demo activo' : 'Conectado';
      UI.setStatus('online', modeLabel);
      UI.setModelBadge(this.state.demoMode ? 'Modo Demo 🟡' : 'IA Activa 🟢');
    } else {
      UI.showError(result.error || 'No se pudieron cargar los datos.');
      UI.setStatus('error', 'Sin conexión');
    }
  },

  /* ── CAMBIAR TAB DE GOOGLE SHEET ── */
  async switchSheetTab(tabName) {
    if (this.state.currentTab === tabName) return;
    this.state.currentTab = tabName;
    await this.loadData();
  },

  /* ── RECARGAR ── */
  async reload() {
    await this.loadData();
    UI.showToast('Datos actualizados', 'success');
  },

  /* ── MODO DEMO ── */
  toggleDemoMode(enabled) {
    this.state.demoMode = enabled;
    UI.setModelBadge(enabled ? 'Modo Demo 🟡' : 'IA Activa 🟢');
  },

  /* ── GUARDAR CONFIG ── */
  saveConfig() {
    const url  = document.getElementById('cfg-worker-url').value.trim();
    const demo = document.getElementById('cfg-demo-mode').checked;

    Utils.store('workerUrl', url);
    Utils.store('demoMode', demo);

    this.state.workerUrl = url;
    this.state.demoMode  = demo;

    UI.toggleConfig();
    UI.showToast('Configuración guardada', 'success');
    this.loadData();
  },
};

/* ── ARRANCAR ── */
document.addEventListener('DOMContentLoaded', () => App.init());
window.App = App;
