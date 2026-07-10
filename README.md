# Akua Fields — Checkout de ejemplo, listo para copiar

Un checkout **completo y funcionando** con campos de tarjeta embebidos:
los inputs de tarjeta viven en un iframe seguro (tu página **nunca ve el número
de tarjeta** → tu comercio queda en **SAQ A**, el nivel más liviano de PCI), y
tu backend solo habla con el hub — mintear token, crear cliente, cobrar.

**Demo live (sin instalar nada):** https://akua-fields-examples-akua-la.vercel.app

## Probalo en 3 pasos

```bash
# 1. Cloná
git clone https://github.com/akua-la/akua-fields-examples
cd akua-fields-examples

# 2. Poné tus credenciales de sandbox (te las da tu proveedor)
cp .env.example .env      # → completá AKUA_CLIENT_ID y AKUA_CLIENT_SECRET

# 3. Corré (Node 18+, sin npm install — cero dependencias)
node server.js            # → abrí http://localhost:4000
```

Pagá con la tarjeta de prueba **4111 1111 1111 1111**, vencimiento **12/30**,
cualquier CVV → vas a ver el `ENROLLED` de la tokenización y el `APPROVED`
del cobro, en vivo, contra sandbox.

## Qué hace el flujo (y qué te llevás a producción)

```
checkout.html ── GET  /token ──► server.js ──► {HUB}/oauth/token    ① tu backend mintea el JWT
checkout.html ── POST /user ───► server.js ──► {HUB}/v1/users       ② tu backend crea el cliente (usr-…)
checkout.html ── sf.enroll({userId}) ────────► fields (iframe)      ③ la tarjeta se tokeniza (ins-…)
checkout.html ── POST /pay-hub ► server.js ──► {HUB}/v1/payments    ④ tu backend cobra con el ins-…
```

`server.js` (~180 líneas, sin dependencias) **es el contrato de tu backend
real**: esos tres endpoints son lo único que tenés que implementar en tu stack.
Incluye el patrón de reintento seguro para producción: reintenta el cobro con
el **mismo `order_id`** y, si el hub responde `resource_already_exists`,
reconoce que el intento original cobró — nunca cobra dos veces.

Dos reglas que ya vienen aplicadas en el código:

- **El `client_secret` nunca va al navegador.** El front recibe el JWT ya
  minteado por tu server.
- **Guardá el `usr-…`** que devuelve crear-cliente y reusalo en compras
  futuras del mismo cliente (no crees un usuario por compra).

## Archivos

| Archivo | Qué es |
|---|---|
| [`server.js`](server.js) | Tu "backend" de ejemplo: `/token`, `/user`, `/pay-hub` + sirve el checkout |
| [`checkout.html`](checkout.html) | El checkout completo: datos del cliente + campos embebidos + cobro |
| [`.env.example`](.env.example) | Credenciales y URLs — copialo a `.env` |
| [`examples/minimal.html`](examples/minimal.html) | La versión mínima estática (~20 líneas), pago directo con `sf.pay()` |
| [`examples/store.html`](examples/store.html) | Variante de tienda con marca, también estática |

Los ejemplos estáticos de `examples/` no necesitan server propio: servilos con
`npx serve .` y pasales el JWT por `?token=<jwt>` (mintealo con `curl` a
`{HUB}/oauth/token`).

## Configuración

Todo vive en [`.env`](.env.example):

| Variable | Qué es |
|---|---|
| `AKUA_CLIENT_ID` / `AKUA_CLIENT_SECRET` | Tus credenciales de sandbox |
| `HUB_BASE` | La base URL de tu proveedor (sección **Base URL** de su doc) |
| `FIELDS_BASE` | El dominio que hostea los campos (te lo da tu proveedor) |

## Documentación completa

Setup en 5 pasos, asignar tarjeta a un cliente, `enroll()` sin cobrar y manejo
de errores: portal de docs de tu proveedor, sección **Campos embebidos**.
