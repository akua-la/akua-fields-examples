#!/usr/bin/env node
/*
 * Server local de ejemplo — cero dependencias npm (Node 18+).
 *
 * Es la parte que TU BACKEND implementa en la vida real. Los campos de tarjeta
 * (iframe seguro) van directo al servicio de fields; tu backend solo hace tres
 * cosas, siempre contra el hub que te dio tu proveedor:
 *
 *   checkout.html ── GET  /token ───► este server ──► {HUB}/oauth/token   (mint del JWT,
 *                                                     con TUS credenciales — nunca en el browser)
 *   checkout.html ── POST /user ────► este server ──► {HUB}/v1/users      (crea el cliente → usr-…)
 *   checkout.html ── sf.enroll({userId}) ───────────► fields (tokeniza la tarjeta → ins-…)
 *   checkout.html ── POST /pay-hub ─► este server ──► {HUB}/v1/payments   (cobra con el ins-…)
 *
 * Uso:  cp .env.example .env   (completá tus credenciales)
 *       node server.js         → http://localhost:4000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

function loadDotEnv(file) {
  const out = {};
  try {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* sin .env — se avisa al mintear */
  }
  return out;
}
const env = { ...loadDotEnv(path.join(__dirname, '.env')), ...process.env };

const PORT = env.LOCAL_PORT || 4000;
// La base del hub te la da tu proveedor (es la de la sección "Base URL" de su doc).
const HUB_BASE = env.HUB_BASE || 'https://puntodepago-connect.akua.la';
// El servicio que hostea los campos de tarjeta (iframe).
const FIELDS_BASE = env.FIELDS_BASE || 'https://fields.akuaring.com';

async function mintToken() {
  if (!env.AKUA_CLIENT_ID || !env.AKUA_CLIENT_SECRET) {
    throw new Error('faltan AKUA_CLIENT_ID / AKUA_CLIENT_SECRET — copiá .env.example a .env y completalo');
  }
  const r = await fetch(`${HUB_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.AKUA_CLIENT_ID,
      client_secret: env.AKUA_CLIENT_SECRET,
    }),
  });
  const j = await r.json().catch(() => ({}));
  console.log(`[hub] POST /oauth/token status=${r.status}`);
  if (!r.ok) throw new Error(j.message || `mint falló (HTTP ${r.status})`);
  return j;
}

// El COMERCIO crea el usuario (usr-…) con su JWT. Guardá ese usr-… asociado a tu
// cliente y reusalo en compras futuras en lugar de crear uno nuevo cada vez.
async function createUser(token, { name, email, phone, document_type, document_number }) {
  const body = { name, email, phone, document_type, document_number };
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);
  const r = await fetch(`${HUB_BASE}/v1/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  console.log(`[hub] POST /v1/users status=${r.status} id=${j.id || '-'}`);
  if (!r.ok || !j.id) throw new Error(j.message || `crear usuario falló (HTTP ${r.status})`);
  return j.id;
}

async function callHub(orderId, { token, instrument_id, amount, currency }) {
  try {
    const r = await fetch(`${HUB_BASE}/v1/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, amount, currency, instrument_id }),
    });
    const body = await r.json().catch(() => ({}));
    console.log(`[hub] POST /v1/payments orderId=${orderId} status=${r.status}`);
    return { ok: r.ok, status: r.status, body };
  } catch (e) {
    // fetch tiró (timeout/red) — no sabemos si el hub llegó a procesar.
    console.log(`[hub] POST /v1/payments orderId=${orderId} SIN RESPUESTA — ${e.message}`);
    return { ok: false, status: 0, body: {}, networkError: e.message };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Patrón de reintento seguro (llevátelo a tu backend tal cual): reintentar con el
// MISMO order_id. Si el hub responde "resource_already_exists", el intento
// original sí cobró — no se cobra de nuevo.
async function payViaHub(params) {
  let last = null;
  for (let i = 0; i < 3; i++) {
    if (i > 0) await sleep(700);
    last = await callHub(params.orderId, params);
    if (last.ok) return last;
    if (last.status === 409 && (last.body || {}).error_code === 'resource_already_exists') {
      return {
        ok: true,
        status: 200,
        body: {
          status: 'ALREADY_PROCESSED',
          order_id: params.orderId,
          message: 'El cobro ya se había hecho (la respuesta anterior se perdió); no se cobró de nuevo.',
        },
      };
    }
  }
  const hasRealReason = last.status !== 0 && last.body && (last.body.message || last.body.response_code_description);
  return {
    ok: false,
    status: last.status || 502,
    body: hasRealReason
      ? last.body
      : {
          status: 'UNKNOWN',
          message:
            'No pudimos confirmar el estado del pago (timeouts en 3 intentos). Puede haberse cobrado igual — ' +
            'revisá el order_id "' + params.orderId + '" antes de reintentar, para no cobrar dos veces.',
        },
  };
}

function send(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  console.log(`[http] ${req.method} ${req.url}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(__dirname, 'checkout.html')));
  }

  // config para el front: de dónde cargar los campos (pisable por .env).
  if (req.method === 'GET' && req.url === '/config.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    return res.end(`window.AKUA_SF_BASE = ${JSON.stringify(FIELDS_BASE)};\n`);
  }

  if (req.method === 'GET' && req.url === '/token') {
    try {
      const t = await mintToken();
      return send(res, 200, { token: t.access_token, expires_in: t.expires_in });
    } catch (e) {
      return send(res, 502, { error: 'mint_failed', message: e.message });
    }
  }

  if (req.method === 'POST' && (req.url === '/user' || req.url === '/pay-hub')) {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', async () => {
      try {
        const payload = JSON.parse(raw || '{}');
        if (req.url === '/user') {
          if (!payload.token) return send(res, 400, { error: 'missing_token' });
          const userId = await createUser(payload.token, payload);
          return send(res, 200, { user_id: userId });
        }
        const { ok, status, body } = await payViaHub(payload);
        return send(res, ok ? 200 : status, body);
      } catch (e) {
        return send(res, 502, { error: 'request_failed', message: e.message });
      }
    });
    return;
  }

  send(res, 404, { error: 'not_found' });
});

server.listen(PORT, () => {
  console.log(`Checkout de ejemplo: http://localhost:${PORT}/`);
  console.log(`Hub: ${HUB_BASE}`);
  console.log(`Fields: ${FIELDS_BASE}`);
});
