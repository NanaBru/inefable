# InefableBot CRM 🤖

> CRM ligero y potente. Frontend en GitHub Pages · Backend en Cloudflare Workers · Base de datos en Google Sheets.

![License](https://img.shields.io/badge/license-MIT-purple) ![Deploy](https://img.shields.io/badge/deploy-GitHub%20Pages-blue)

---

## 🚀 Deploy rápido

### 1. Frontend (GitHub Pages)
1. Hacé fork o subí este repositorio a tu GitHub.
2. Ir a **Settings → Pages → Source: Deploy from branch → `main` → `/` (root)**.
3. En unos segundos tu app estará en `https://tuusuario.github.io/inefablebot/`.

### 2. Google Apps Script (Base de Datos Gratis)
1. **Preparar el Sheet**: Asegurate de que la primera fila tenga los encabezados.
2. **Instalar el Script**:
   - En tu Google Sheet, andá a **Extensiones → Apps Script**.
   - Borrá todo y pegá el contenido de [google-apps-script.gs](file:///c:/Users/nahum/Desktop/nahum/fiorella/inefablebot/google-apps-script.gs).
   - **CAMBIÁ** la variable `APP_TOKEN` por una clave secreta que inventes.
   - Dale a **Implementar → Nueva implementación**.
   - Tipo: **Aplicación web**.
   - Ejecutar como: **Tú**.
   - Quién tiene acceso: **Cualquier persona**.
   - Copiá la **URL de la aplicación web**.

### 3. Cloudflare Worker (El Cerebro)
1. En tu panel de Cloudflare, creá un nuevo Worker.
2. Borrá todo el código y pegá el contenido de `worker.js` que está en este repo.
3. **Variables de Entorno (IMPORTANTE)**:
   - Ir a **Settings → Variables → Bindings / Secrets**.
   - Agregá estas tres:
4. Dale a **Deploy**.

### 4. Conectar el Frontend
1. Abrí la app en GitHub Pages.
2. Hacé clic en ⚙️ **Configuración**.
3. Pegá la URL de tu Worker (ej: `https://inefablebot-worker.tuusuario.workers.dev`).
4. Desactivá el **Modo Demo**.
5. ¡Listo!

---

## 📁 Estructura

```
/
├── index.html          # Shell principal
├── css/styles.css      # Dark mode, split-view, animaciones
├── js/
│   ├── app.js          # Orquestador
│   ├── ui.js           # Tabla (Grid.js) + Chat
│   ├── api-client.js   # Comunicación con el Worker
│   └── utils.js        # Formateo y utilidades
└── worker.js           # Cloudflare Worker (backend)
```

---

## ✨ Características
- 📊 **Tabla dinámica**: lee columnas automáticamente del Sheet (Grid.js)
- 🤖 **IA con Function Calling**: la IA puede editar celdas con lenguaje natural
- 🔒 **Sin backend propio**: las credenciales viven en Cloudflare, no en el frontend
- 📱 **Responsive**: vista dividida en PC, tabs en móvil
- 🟡 **Modo Demo**: funciona sin configuración para ver la UI

---

## 🛠 Tecnologías
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Tabla**: [Grid.js](https://gridjs.io)
- **Backend**: Cloudflare Workers
- **DB**: Google Sheets API v4
- **IA**: OpenRouter (Claude, GPT-4, etc.)
