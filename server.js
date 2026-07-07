#!/usr/bin/env node
/*
 * Backend de ejemplo — sirve este sitio estático y resuelve las DOS cosas que
 * tienen que salir de TU servidor, nunca del navegador: el token (client_credentials)
 * y la clave pública de Dual Encryption. Cero dependencias npm.
 *
 * Dual Encryption ya no es opcional: es el único formato soportado para Campos
 * embebidos. Sin encryptionPublicKey, AkuaFields.mount() no tokeniza.
 *
 * Uso: cp .env.example .env  →  completá tus credenciales  →  node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4000;

function loadDotEnv(file) {
  const out = {};
  try {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* sin .env local */ }
  return out;
}
const env = { ...loadDotEnv(path.join(__dirname, '.env')), ...process.env };
const AKUA_BASE = env.AKUA_BASE || 'https://sandbox.akua.la';

async function mintToken() {
  if (!env.AKUA_CLIENT_ID || !env.AKUA_CLIENT_SECRET) {
    throw new Error('faltan AKUA_CLIENT_ID/AKUA_CLIENT_SECRET en .env');
  }
  const r = await fetch(`${AKUA_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: env.AKUA_CLIENT_ID,
      client_secret: env.AKUA_CLIENT_SECRET,
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || `mint falló (HTTP ${r.status})`);
  return j.access_token;
}

// GET primero (reusa la clave activa si tu comercio ya tiene una); si no hay
// ninguna, la crea con POST. Así el server no rota la clave en cada arranque.
async function getOrCreateEncryptionKey(token) {
  let r = await fetch(`${AKUA_BASE}/v1/encryption/keys`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.ok) return (await r.json()).public_key;

  r = await fetch(`${AKUA_BASE}/v1/encryption/keys`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.public_key) throw new Error(j.message || `no se pudo obtener la clave de cifrado (HTTP ${r.status})`);
  return j.public_key;
}

function send(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

function serveStatic(req, res) {
  const reqPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.join(__dirname, reqPath);
  if (!filePath.startsWith(__dirname)) return send(res, 403, { error: 'forbidden' });
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, { error: 'not_found' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  if (req.method === 'GET' && url === '/token') {
    try {
      const token = await mintToken();
      return send(res, 200, { token });
    } catch (e) {
      return send(res, 502, { error: 'mint_failed', message: e.message });
    }
  }

  if (req.method === 'GET' && url === '/encryption-key') {
    try {
      const token = await mintToken();
      const public_key = await getOrCreateEncryptionKey(token);
      return send(res, 200, { public_key });
    } catch (e) {
      return send(res, 502, { error: 'encryption_key_failed', message: e.message });
    }
  }

  if (req.method === 'GET') return serveStatic(req, res);

  send(res, 404, { error: 'not_found' });
});

server.listen(PORT, () => {
  console.log(`akua-fields-examples escuchando en http://localhost:${PORT}`);
  console.log(`Akua base: ${AKUA_BASE}`);
});
