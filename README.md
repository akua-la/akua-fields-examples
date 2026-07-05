# Akua Fields — Ejemplos de integración

Checkouts de ejemplo con **campos de tarjeta embebidos** (Akua Fields): los inputs
de tarjeta viven en un iframe seguro servido por el servicio de campos, así tu
página **nunca ve el PAN** y tu comercio queda en **SAQ A** (el nivel más liviano
de PCI). Todo lo demás del checkout — layout, botón, estilos — es 100% tuyo.

**Demo live:** https://akua-fields-examples-akua-la.vercel.app

## Ejemplos

| Ejemplo | Qué muestra |
|---|---|
| [`examples/minimal.html`](examples/minimal.html) | El checkout mínimo que cobra — una página, ~20 líneas |
| [`examples/store.html`](examples/store.html) | Checkout de tienda con marca: resumen de orden, estilos propios |

## Correr localmente

Son páginas estáticas — no hay build:

```bash
git clone https://github.com/akua-la/akua-fields-examples
cd akua-fields-examples
npx serve .        # abre http://localhost:3000
```

## Apuntar a tu servicio

Los ejemplos leen la URL del servicio de campos desde [`config.js`](config.js):

```js
window.AKUA_SF_BASE = 'https://akua-fields-akua-la.vercel.app'; // sandbox
```

En producción, reemplazala por el dominio que te entrega tu proveedor.

## El token (JWT)

Los campos se autentican con un Bearer token `client_credentials` **minteado por
tu backend** (nunca pongas tu `client_secret` en el navegador). Los ejemplos lo
toman de `?token=<jwt>` en la URL o de `window.AKUA_TOKEN`.

## Probar en sandbox

Tarjeta de prueba: `4111 1111 1111 1111` · venc `12/30` · CVV `123`.

## Documentación

La guía completa (setup en 5 pasos, asignar tarjeta a un cliente, `enroll()` sin
cobrar, manejo de errores) está en el portal de docs de tu proveedor, sección
**Campos embebidos**.
