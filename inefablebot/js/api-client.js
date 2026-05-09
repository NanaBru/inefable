/**
 * api-client.js — Comunicación con el Cloudflare Worker
 * Incluye modo DEMO con datos de ejemplo para usar sin Worker.
 */
const ApiClient = {

  /* ── CONFIG ── */
  get workerUrl() {
    return Utils.load('workerUrl', 'https://inefablebot-worker.nanabru.workers.dev');
  },
  get demoMode() {
    return Utils.load('demoMode', false); // Demo OFF por defecto para usar el Worker
  },

  /* ── DEMO DATA ── */
  _demoData: [
    { ID: 1, Cliente: 'Marcos Acuña',     Plan: 'Premium',  Seña: '$15.000', Estado: 'Activo',    Fecha: '2025-04-10', Notas: 'Pago por transferencia' },
    { ID: 2, Cliente: 'Laura Gómez',      Plan: 'Básico',   Seña: '$5.000',  Estado: 'Pendiente', Fecha: '2025-04-15', Notas: 'Espera confirmación' },
    { ID: 3, Cliente: 'Javier Sosa',      Plan: 'Premium',  Seña: '$15.000', Estado: 'Pagado',    Fecha: '2025-03-28', Notas: '' },
    { ID: 4, Cliente: 'Ana Benítez',      Plan: 'Standard', Seña: '$8.000',  Estado: 'Activo',    Fecha: '2025-04-20', Notas: 'Seguimiento 2da cuota' },
    { ID: 5, Cliente: 'Diego Ramirez',    Plan: 'Premium',  Seña: '$15.000', Estado: 'Cancelado', Fecha: '2025-04-05', Notas: 'Rechazó la propuesta' },
    { ID: 6, Cliente: 'Sofía Leiva',      Plan: 'Básico',   Seña: '$5.000',  Estado: 'Pendiente', Fecha: '2025-04-22', Notas: '' },
    { ID: 7, Cliente: 'Nicolás Herrera',  Plan: 'Standard', Seña: '$8.000',  Estado: 'Pagado',    Fecha: '2025-04-01', Notas: 'Todo al día' },
    { ID: 8, Cliente: 'Valentina Cruz',   Plan: 'Premium',  Seña: '$15.000', Estado: 'Activo',    Fecha: '2025-04-18', Notas: 'Muy interesada' },
    { ID: 9, Cliente: 'Rodrigo Peña',     Plan: 'Básico',   Seña: '$5.000',  Estado: 'En proceso',Fecha: '2025-04-25', Notas: 'Enviando contrato' },
    { ID: 10,Cliente: 'Florencia Álvarez',Plan: 'Standard', Seña: '$8.000',  Estado: 'Activo',    Fecha: '2025-04-12', Notas: '' },
  ],

  _demoTabs: ['Clientes', 'Ventas', 'Gastos'],
  _demoMessages: [],

  /* ── LISTAR TABS ── */
  async fetchTabs() {
    if (this.demoMode || !this.workerUrl) {
      await this._fakeDelay(300);
      return { ok: true, tabs: this._demoTabs };
    }
    try {
      const res = await fetch(`${this.workerUrl}/list-tabs`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const tabs = await res.json();
      return { ok: true, tabs };
    } catch (err) {
      console.error('[ApiClient] fetchTabs error:', err);
      return { ok: false, error: err.message };
    }
  },

  /* ── LEER DATOS ── */
  async fetchData(tab = '') {
    if (this.demoMode || !this.workerUrl) {
      await this._fakeDelay(600);
      return { ok: true, data: this._demoData };
    }
    try {
      const url = new URL(`${this.workerUrl}/leer-datos`);
      if (tab) url.searchParams.set('tab', tab);
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { ok: true, data };
    } catch (err) {
      console.error('[ApiClient] fetchData error:', err);
      return { ok: false, error: err.message };
    }
  },

  /* ── ACTUALIZAR CELDA ── */
  async updateCell(rowIndex, column, newValue, tab = '') {
    if (this.demoMode || !this.workerUrl) {
      await this._fakeDelay(400);
      // Actualiza demo data en memoria
      const row = this._demoData[rowIndex - 1];
      if (row && row.hasOwnProperty(column)) {
        row[column] = newValue;
        return { ok: true, message: `✅ [DEMO] "${column}" actualizado a "${newValue}"` };
      }
      return { ok: false, error: 'Fila o columna no encontrada en datos de demo' };
    }
    try {
      const res = await fetch(`${this.workerUrl}/actualizar-celda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fila: rowIndex, columna: column, nuevo_valor: newValue, tab })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[ApiClient] updateCell error:', err);
      return { ok: false, error: err.message };
    }
  },

  /* ── AGREGAR FILA ── */
  async addRow(datos, tab = '') {
    if (this.demoMode || !this.workerUrl) {
      await this._fakeDelay(400);
      return { ok: true, message: "✅ [DEMO] Registro simulado creado", fila: this._demoData.length + 1 };
    }
    try {
      const res = await fetch(`${this.workerUrl}/crear-registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos, tab })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[ApiClient] addRow error:', err);
      return { ok: false, error: err.message };
    }
  },

  /* ── CHAT CON IA ── */
  async sendChat(messages, headers = [], sheetData = []) {
    if (this.demoMode || !this.workerUrl) {
      await this._fakeDelay(900);
      return { ok: true, reply: this._demoReply(messages, headers) };
    }
    try {
      const res = await fetch(`${this.workerUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, headers, data: sheetData })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { ok: true, reply: data.reply, toolCall: data.toolCall };
    } catch (err) {
      console.error('[ApiClient] sendChat error:', err);
      return { ok: false, error: err.message };
    }
  },

  /* ── DEMO REPLY ── */
  _demoReply(messages, headers) {
    const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || '';
    const cols = headers.join(', ');

    if (/pendiente/.test(lastMsg))
      return `En el sheet hay **2 clientes pendientes**: Laura Gómez y Sofía Leiva. Ambas están esperando confirmación de pago.`;

    if (/seña|pago|debe/.test(lastMsg))
      return `Según el seguimiento, los clientes con **seña pendiente** son:\n- Laura Gómez ($5.000)\n- Sofía Leiva ($5.000)\n- Rodrigo Peña ($5.000)\n\n¿Querés que actualice alguno?`;

    if (/columna|campo|tiene/.test(lastMsg))
      return `El sheet tiene las siguientes columnas:\n\`${cols}\`\n\nPuedo leer y editar cualquiera de ellas.`;

    if (/activo/.test(lastMsg))
      return `Los clientes con estado **Activo** son: Marcos Acuña, Ana Benítez, Valentina Cruz y Florencia Álvarez.`;

    if (/hola|buenas|hey/.test(lastMsg))
      return `¡Hola! 👋 Estoy listo para ayudarte con el seguimiento. Actualmente estás en **modo demo** con 10 clientes de ejemplo.\n\nPodés preguntarme:\n- "¿Quién debe una seña?"\n- "¿Cuántos están activos?"\n- "Actualizá el estado de Marcos a Pagado"`;

    return `Entendido. En este momento estás en **modo demo** 🟡, así que mis respuestas son simuladas.\n\nConectá tu Cloudflare Worker para habilitar la IA real con acceso a tu Google Sheet.\n\n📌 Abrí ⚙️ Configuración e ingresá la URL de tu Worker.`;
  },

  _fakeDelay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
};

window.ApiClient = ApiClient;
