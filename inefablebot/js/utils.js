/**
 * utils.js — Helpers de formato y utilidades generales
 */
const Utils = {

  /**
   * Formatea un valor numérico como moneda ARS
   */
  formatCurrency(value) {
    const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency', currency: 'ARS', maximumFractionDigits: 0
    }).format(num);
  },

  /**
   * Formatea una fecha ISO o string de fecha en formato legible
   */
  formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },

  /**
   * Detecta el tipo de contenido de una celda para renderizado especial
   */
  detectType(header, value) {
    const h = header.toLowerCase();
    const v = String(value).trim();

    if (!v || v === '-' || v === '') return 'empty';
    if (/seña|pago|precio|monto|total|costo|importe|saldo/.test(h)) return 'currency';
    if (/fecha|date|día|dia/.test(h)) return 'date';
    if (/estado|status|etapa|stage/.test(h)) return 'status';
    if (/tel|celular|phone|whatsapp/.test(h)) return 'phone';
    if (/mail|email/.test(h)) return 'email';

    return 'text';
  },

  /**
   * Renderiza un badge de estado según el texto
   */
  renderStatusBadge(value) {
    const v = String(value).toLowerCase().trim();
    let cls = 'badge-blue';
    if (/pagado|cerrado|completado|listo|done/.test(v)) cls = 'badge-green';
    else if (/pendiente|espera|waiting/.test(v)) cls = 'badge-yellow';
    else if (/cancelado|rechazado|perdido/.test(v)) cls = 'badge-red';
    else if (/activo|en proceso|seguimiento/.test(v)) cls = 'badge-purple';
    return `<span class="badge ${cls}">${value}</span>`;
  },

  /**
   * Trunca texto largo con ellipsis
   */
  truncate(str, maxLen = 35) {
    if (!str) return '';
    str = String(str);
    return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
  },

  /**
   * Escapa HTML para evitar XSS
   */
  escapeHtml(str) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(str).replace(/[&<>"']/g, m => map[m]);
  },

  /**
   * Convierte markdown simple a HTML (para respuestas de la IA)
   */
  markdownToHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/```([\s\S]+?)```/g, '<pre>$1</pre>')
      .replace(/\n/g, '<br>');
  },

  /**
   * Debounce genérico
   */
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  },

  /**
   * Guarda en localStorage con prefijo
   */
  store(key, value) {
    try { localStorage.setItem(`inefable_${key}`, JSON.stringify(value)); } catch {}
  },

  /**
   * Lee de localStorage
   */
  load(key, fallback = null) {
    try {
      const v = localStorage.getItem(`inefable_${key}`);
      return v !== null ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },

  /**
   * Genera un ID único simple
   */
  uid() {
    return Math.random().toString(36).slice(2, 9);
  },

  /**
   * Extrae headers de un array de objetos
   */
  getHeaders(rows) {
    if (!rows || !rows.length) return [];
    return Object.keys(rows[0]);
  }
};

window.Utils = Utils;
