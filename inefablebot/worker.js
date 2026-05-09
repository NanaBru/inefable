/**
 * worker.js — Cloudflare Worker para InefableBot CRM (Versión GAS Gratis)
 */
// Hardcoded Config (To avoid environment variable issues in Cloudflare)
const CONFIG = {
  OPENROUTER_API_KEY: "",
  GAS_WEBAPP_URL: "",
  GAS_TOKEN: ""
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

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/list-tabs' && request.method === 'GET') {
        const result = await talkToGAS(CONFIG, { action: 'listTabs' });
        return jsonResponse(result);
      }

      if (path === '/leer-datos' && request.method === 'GET') {
        const tab = url.searchParams.get('tab') || '';
        const result = await talkToGAS(CONFIG, { action: 'readData', tab });
        return jsonResponse(result);
      }

      if (path === '/actualizar-celda' && request.method === 'POST') {
        const body = await request.json();
        const result = await talkToGAS(CONFIG, {
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
        const result = await procesarChat(CONFIG, body.messages, body.headers);
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

async function procesarChat(config, messages, headers = []) {
  const systemPrompt = `Sos InefableBot, un asistente de CRM inteligente.
Tenés acceso a un Google Sheet con las siguientes columnas: ${headers.join(', ')}.
Podés leer datos, responder preguntas sobre los clientes y editar celdas usando la herramienta "editar_cliente".
Respondé siempre en español, de forma clara y concisa.
Cuando necesites editar algo, usá la herramienta. Cuando solo necesites responder, hacelo directamente.`;

  const tools = [
    {
      type: 'function',
      function: {
        name: 'editar_cliente',
        description: 'Actualiza el valor de una celda específica en el Google Sheet de clientes.',
        parameters: {
          type: 'object',
          properties: {
            fila: { type: 'number', description: 'Fila del cliente (1 = primer cliente)' },
            columna: { type: 'string', description: `Columna a editar. Opciones: ${headers.join(', ')}` },
            nuevo_valor: { type: 'string', description: 'El nuevo valor' }
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
