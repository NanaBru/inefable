/**
 * worker.js — Cloudflare Worker para InefableBot CRM (Versión GAS Gratis)
 */

// ══════════════════════════════════════════════
// CONFIGURACIÓN — Opción A: Hardcoded (más fácil)
// Completá estos valores si los secrets de Cloudflare no están configurados
// ══════════════════════════════════════════════
const CONFIG = {
  OPENROUTER_API_KEY: "",  // ← pegá tu key de OpenRouter aquí si no usás secrets
  GAS_WEBAPP_URL: "",      // ← URL de tu Google Apps Script Web App
  GAS_TOKEN: "todolopuedoencristoquemefortalece"  // ← debe coincidir con APP_TOKEN en el .gs
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Opción B: leer desde Cloudflare Secrets (tienen prioridad sobre CONFIG hardcodeado)
    const cfg = {
      OPENROUTER_API_KEY: env.OPENROUTER_API_KEY || CONFIG.OPENROUTER_API_KEY,
      GAS_WEBAPP_URL:     env.GAS_WEBAPP_URL     || CONFIG.GAS_WEBAPP_URL,
      GAS_TOKEN:          env.GAS_TOKEN          || CONFIG.GAS_TOKEN,
    };

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/list-tabs' && request.method === 'GET') {
        const result = await talkToGAS(cfg, { action: 'listTabs' });
        return jsonResponse(result);
      }

      if (path === '/leer-datos' && request.method === 'GET') {
        const tab = url.searchParams.get('tab') || '';
        const result = await talkToGAS(cfg, { action: 'readData', tab });
        return jsonResponse(result);
      }

      if (path === '/actualizar-celda' && request.method === 'POST') {
        const body = await request.json();
        const result = await talkToGAS(cfg, {
          action: 'updateCell',
          fila: body.fila,
          columna: body.columna,
          nuevoValor: body.nuevo_valor,
          tab: body.tab
        });
        return jsonResponse(result);
      }

      if (path === '/chat' && request.method === 'POST') {
        const body = await request.json();
        const result = await procesarChat(cfg, body.messages, body.headers, body.data || []);
        return jsonResponse(result);
      }

      return jsonResponse({ error: 'Ruta no encontrada' }, 404);

    } catch (err) {
      console.error('Worker error:', err);
      return jsonResponse({ error: err.message }, 500);
    }
  }
};

/* ══════════════════════════════════════
   COMUNICACIÓN CON GOOGLE APPS SCRIPT
══════════════════════════════════════ */

async function talkToGAS(config, payload) {
  const res = await fetch(config.GAS_WEBAPP_URL, {
    method: 'POST',
    body: JSON.stringify({
      token: config.GAS_TOKEN,
      ...payload
    })
  });

  if (!res.ok) throw new Error(`Error en GAS: ${res.statusText}`);
  return await res.json();
}

/* ══════════════════════════════════════
   CHAT CON IA (OpenRouter)
══════════════════════════════════════ */

async function procesarChat(config, messages, headers = [], sheetData = []) {

  // Serializar los datos del sheet para incluirlos en el contexto de la IA
  let dataContext = '';
  if (sheetData && sheetData.length > 0) {
    const MAX_ROWS = 200; // límite para no explotar el contexto
    const rows = sheetData.slice(0, MAX_ROWS);
    const lines = rows.map((row, i) => {
      const fields = headers.map(h => `${h}: "${row[h] ?? ''}"`).join(' | ');
      return `Fila ${i + 1}: ${fields}`;
    });
    dataContext = `\n\nDATOS ACTUALES DEL SHEET (${rows.length} registros):\n${lines.join('\n')}`;
    if (sheetData.length > MAX_ROWS) {
      dataContext += `\n... (y ${sheetData.length - MAX_ROWS} registros más)`;
    }
  }

  const systemPrompt = `Sos InefableBot, un asistente de CRM inteligente para el negocio de eventos "Inefable".
Tenés acceso COMPLETO al Google Sheet con las siguientes columnas: ${headers.join(', ')}.
${dataContext}

INSTRUCCIONES IMPORTANTES:
- Podés buscar clientes por nombre, fecha, teléfono o cualquier campo directamente con los datos de arriba.
- Cuando alguien pregunta por una fecha (ej: "16/05", "16 de mayo"), buscá en la columna de fechas de los datos.
- Para buscar, simplemente leé los datos del contexto y respondé. No necesitás ninguna herramienta para buscar.
- Para EDITAR una celda, usá la herramienta "editar_cliente" con el número de fila exacto.
- Respondé siempre en español, de forma clara, amigable y concisa.
- Si encontrás varios resultados, mostralos todos.
- Si no encontrás resultados, decilo claramente.`;

  const tools = [
    {
      type: 'function',
      function: {
        name: 'editar_cliente',
        description: 'Actualiza el valor de una celda específica en el Google Sheet de clientes.',
        parameters: {
          type: 'object',
          properties: {
            fila: { type: 'number', description: 'Número de fila del cliente según los datos del sheet (Fila 1 = primer registro)' },
            columna: { type: 'string', description: `Columna a editar. Opciones: ${headers.join(', ')}` },
            nuevo_valor: { type: 'string', description: 'El nuevo valor a escribir' }
          },
          required: ['fila', 'columna', 'nuevo_valor']
        }
      }
    }
  ];

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://nanabru.github.io',
      'X-Title': 'InefableBot CRM'
    },
    body: JSON.stringify({
      model: 'inclusionai/ring-2.6-1t:free',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      tools,
      tool_choice: 'auto'
    })
  });

  const data = await res.json();
  const choice = data.choices?.[0];
  if (!choice) throw new Error('Sin respuesta de la IA');

  if (choice.message?.tool_calls?.length) {
    const toolCall = choice.message.tool_calls[0];
    return {
      reply: `📝 Ejecutando: **${toolCall.function.name}**…`,
      toolCall: {
        name: toolCall.function.name,
        parameters: JSON.parse(toolCall.function.arguments)
      }
    };
  }

  return { reply: choice.message?.content || '…' };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}
