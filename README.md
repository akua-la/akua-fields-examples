# Akua Fields — Ejemplos

Gallery de checkouts de ejemplo que usan **Akua Fields** (campos de tarjeta
embebidos, aislamiento cross-origin, **Dual Encryption obligatorio**) y cobran
por **Connect Hub**. Al estilo del repo de ejemplos de dLocal
(`smart-fields-examples`): páginas que copiás y customizás, más un backend de
ejemplo mínimo que resuelve las dos cosas que tienen que salir de tu servidor.

> **Dual Encryption ya no es opcional.** El único formato soportado para Campos
> embebidos es: tu backend genera su clave de cifrado y se la pasa a `mount()`.
> Sin `encryptionPublicKey`, el SDK no tokeniza.

## Qué hay

| Archivo | Qué es |
|---|---|
| `server.js` | Backend de ejemplo (Node, sin dependencias): sirve este sitio + `/token` + `/encryption-key` |
| `.env.example` | Credenciales de sandbox que lee `server.js` |
| `index.html` | Gallery / landing |
| `examples/store.html` | Checkout completo con marca (colores/logo/copy) — **el que copiás para armar tu experiencia** |
| `examples/minimal.html` | Lo mínimo: montar campos + botón + pagar |
| `config.js` | Un solo lugar: `window.AKUA_SF_BASE` = URL de tu deploy de Akua Fields |

## Correr local (3 pasos)

```bash
cp .env.example .env      # completá AKUA_CLIENT_ID / AKUA_CLIENT_SECRET (sandbox)
node server.js             # sirve el sitio + /token + /encryption-key
# abrí http://localhost:4000
```

No hace falta nada más — `server.js` mintea el token y crea/reusa tu clave de
cifrado la primera vez que abrís un ejemplo. Los campos vienen del deploy en
`config.js` (por default `akua-fields-akua-la.vercel.app`), así que es
cross-origin de verdad — igual que en producción.

## Cómo funciona (end-to-end)

```
TU backend (server.js)                 tu checkout (origen A)            servicio Akua Fields (origen B)
  │
  ├─ POST {AKUA_BASE}/oauth/token  ────────────────────────────────────► mintea el JWT (client_credentials)
  ├─ GET/POST {AKUA_BASE}/v1/encryption/keys ─────────────────────────► trae/crea tu clave RSA (una vez)
  │
  └─ sirve /token y /encryption-key ──► fetch() en la página ──► mount({ token, encryptionPublicKey })
                                                                              │
                                              <iframe src=B/field.html>  ◄────┘
                                              cifra el PAN (RSA-OAEP-256) DENTRO del iframe,
                                              antes de que salga del navegador
                                                   │ POST B/api/pay (ya cifrado)
                                                   ├─ tokenize → Akua /v1/instruments (directo)
                                    tu botón → sf.pay() ── └─ pago → Connect Hub /v1/payments (mapea, cobra)
```

Tu página **nunca ve el número de tarjeta, ni siquiera cifrado en texto plano
en la red** → tu comercio queda en **SAQ A**. La tokenización va directo a
Akua; el pago con `instrument_id` se rutea por Connect Hub, como el resto de
la integración.

## Armar TU experiencia

1. Copiá `examples/store.html`.
2. Cambiá todo lo visual: `:root` (colores/fuente/radius), el carrito, los campos del
   comprador, los textos. Es HTML tuyo.
3. Lo único que no se toca: el `<div id="akua-card">` (ahí va el iframe de Akua Fields),
   el `fetch('/token')` + `fetch('/encryption-key')`, y `sf.pay()` en tu botón.
4. Apuntá `config.js` a tu deploy de `akua-fields`.
5. En tu backend real (no `server.js`, que es solo para probar local), implementá
   dos endpoints equivalentes — ver la receta abajo.

Snippet esencial (lo que ya hace `examples/minimal.html`):
```html
<div id="akua-card"></div>
<button id="pay" disabled>Pagar</button>
<script src="https://TU-AKUA-FIELDS.vercel.app/akua-fields.js"></script>
<script>
  Promise.all([
    fetch('/token').then(r => r.json()),
    fetch('/encryption-key').then(r => r.json()),
  ]).then(([t, k]) => {
    var sf = AkuaFields.mount('#akua-card', {
      apiBase: 'https://TU-AKUA-FIELDS.vercel.app',
      token: t.token,
      encryptionPublicKey: k.public_key,   // obligatorio
      amount: 100000, currency: 'COP', accent: '#e96024',
      onReady:  () => pay.disabled = false,
      onResult: (r) => { if (r.status === 'APPROVED') { /* confirmar orden */ } },
    });
    pay.onclick = () => sf.pay();
  });
</script>
```

## Receta — tu backend real: token + clave de cifrado

Esto es exactamente lo que hace `server.js`, para copiar tal cual en tu propio
backend (Node, sin dependencias — adaptalo a tu lenguaje si hace falta):

```js
const AKUA_BASE = 'https://sandbox.akua.la'; // producción: la base que te entregó Akua

async function mintToken() {
  const r = await fetch(`${AKUA_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.AKUA_CLIENT_ID,
      client_secret: process.env.AKUA_CLIENT_SECRET,
    }),
  });
  const { access_token } = await r.json();
  return access_token;
}

// GET primero (reusa tu clave activa); POST solo si no hay ninguna —
// así no la rotás en cada arranque. Guardala en memoria/DB de tu lado.
async function getOrCreateEncryptionKey(token) {
  let r = await fetch(`${AKUA_BASE}/v1/encryption/keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (r.ok) return (await r.json()).public_key;

  r = await fetch(`${AKUA_BASE}/v1/encryption/keys`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await r.json()).public_key;
}
```

⚠️ `POST /v1/encryption/keys` **reemplaza** la clave activa si ya existe una —
llamalo una sola vez en la vida de tu comercio, no en cada arranque/request.

## Deploy (Vercel)

`server.js` es para correr **local** mientras armás tu integración. Para
producción, `/token` y `/encryption-key` los expone **tu backend real** (los
mismos dos endpoints de la receta de arriba, como serverless functions o rutas
de tu API) — nunca minteás el token ni generás la clave desde el navegador.

```bash
vercel --prod
```

## Tarjeta de prueba (sandbox)

`4111 1111 1111 1111`, venc `12/30`, cualquier CVV, cualquier nombre → APPROVED.

> El servicio de Akua Fields (repo `akua-fields`) es el que tiene el scope PCI
> (recibe el PAN cifrado). Este sitio de ejemplos, y cualquier comercio que
> integre así, quedan en SAQ A. Ver el README de `akua-fields` para el detalle PCI.
