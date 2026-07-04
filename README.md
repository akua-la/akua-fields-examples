# Akua Smart Fields — Ejemplos

Gallery de checkouts de ejemplo que usan **Akua Smart Fields** (campos de tarjeta
embebidos, aislamiento cross-origin) y cobran por **Connect Hub**. Al estilo del
repo de ejemplos de dLocal (`smart-fields-examples`): páginas estáticas
autocontenidas que copiás y customizás.

## Qué hay

| Página | Qué muestra |
|---|---|
| `index.html` | Gallery / landing |
| `examples/store.html` | Checkout completo con marca (colores/logo/copy) — **el que copiás para armar tu experiencia** |
| `examples/minimal.html` | Lo mínimo: montar campos + botón + pagar (~30 líneas) |
| `config.js` | Un solo lugar: `window.AKUA_SF_BASE` = URL de tu deploy de Smart Fields |

## Cómo funciona (end-to-end)

```
tu checkout (este sitio, origen A)          servicio Smart Fields (origen B: akua-smartfields.vercel.app)
  └─ <iframe src=B/field.html>  ──────────►  captura la tarjeta (aislada; A no la puede leer)
       ▲ postMessage (nunca el PAN)                │ POST B/api/pay
       │                                            ├─ tokenize → Akua /v1/instruments (directo)
   tu botón → sf.pay()                              └─ pago → Connect Hub /v1/payments (mapea, cobra)
```

Tu página **nunca ve el número de tarjeta** (same-origin policy) → tu comercio
queda en **SAQ A**. La tokenización va directo a Akua; el pago con `instrument_id`
se rutea por Connect Hub (mapping/routing/telemetría), como el resto de la integración.

## Correr local

```bash
npx serve .        # o cualquier static server
# abrí http://localhost:3000
```
Los campos vienen del deploy en `config.js` (por default `akua-smartfields.vercel.app`),
así que es cross-origin de verdad — igual que en producción.

## Armar TU experiencia

1. Copiá `examples/store.html`.
2. Cambiá todo lo visual: `:root` (colores/fuente/radius), el carrito, los campos del
   comprador, los textos. Es HTML tuyo.
3. Lo único que no se toca: el `<div id="akua-card">` (ahí va el iframe de Smart Fields)
   y `sf.pay()` en tu botón.
4. Apuntá `config.js` a tu deploy de `akua-smartfields`.

Snippet esencial:
```html
<div id="akua-card"></div>
<button id="pay" disabled>Pagar</button>
<script src="https://TU-SMARTFIELDS.vercel.app/smartfields.js"></script>
<script>
  var sf = AkuaSmartFields.mount('#akua-card', {
    apiBase: 'https://TU-SMARTFIELDS.vercel.app',
    amount: 100000, currency: 'COP', accent: '#e96024',
    onReady:  () => pay.disabled = false,
    onResult: (r) => { if (r.status === 'APPROVED') { /* confirmar orden */ } },
  });
  pay.onclick = () => sf.pay();
</script>
```

## Deploy (Vercel, estático)

```bash
vercel --prod        # es un sitio estático, sin build
```

## Tarjeta de prueba (sandbox)

`4111 1111 1111 1111`, venc `12/30`, cualquier CVV, cualquier nombre → APPROVED.

> El servicio de Smart Fields (repo `akua-smartfields`) es el que tiene el scope PCI
> (recibe el PAN). Este sitio de ejemplos, y cualquier comercio que integre así,
> quedan en SAQ A. Ver el README de `akua-smartfields` para el detalle PCI.
