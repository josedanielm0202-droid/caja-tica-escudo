# Escudo de Caja Tica

El Escudo es un bot de Telegram que cuida tu préstamo de Writz. Te dice cómo está la salud del préstamo (🟢 verde, 🟡 amarillo, 🔴 rojo) y cuánto debés en USDC.

> Esto es una demo en testnet. No es una inversión ni algo sin riesgo.

## 1. Crear el bot con @BotFather
1. En Telegram, buscá **@BotFather** y escribile `/newbot`.
2. Ponele un nombre (ej. "Escudo Caja Tica") y un usuario que termine en `bot`.
3. BotFather te da un **token**. Ese es `TELEGRAM_BOT_TOKEN`. Es secreto: nunca lo subás a GitHub.
4. Escribile cualquier cosa a tu bot y abrí `https://api.telegram.org/bot<TOKEN>/getUpdates` en el navegador. El número en `"chat":{"id": ...}` es `TELEGRAM_CHAT_ID`.

## 2. Variables (`.env`, nunca en la repo)
| Variable | Qué es |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token de @BotFather |
| `TELEGRAM_CHAT_ID` | Chat donde el bot responde y manda alertas |
| `LOAN_TXID` | txid (orden interno) del préstamo a vigilar |
| `ESCUDO_INTERVALO_S` | Cada cuántos segundos revisar la salud (vacío = 30) |
| `ESCUDO_ABONO_AUTO` | Escribí exactamente `on` para que abone solo. Cualquier otra cosa = solo avisa |
| `ESCUDO_ENFRIAMIENTO_S` | Segundos mínimos entre dos abonos automáticos (vacío = 600) |
| `ESCUDO_UMBRAL_ROJO_BP` | Umbral rojo en bp (entero 10000–50000; vacío o inválido = 12500, o sea 125 %). Para la demo en testnet: `45000` |
| `ESCUDO_UMBRAL_AMARILLO_BP` | Umbral amarillo en bp (entero 10000–60000; vacío = 15000). Siempre queda por encima del rojo (si no, rojo + 2500). El abono lleva la salud hasta este valor (mínimo 150 %) |
| `RESERVA_PUBLIC` / `RESERVA_SECRET` | Cuenta de reserva USDC del Escudo (la da José, nunca en la repo) |
| `X402_PAY_TO` | Cuenta G... que recibe los pagos de la consulta de riesgo (solo para `escudo:riesgo`) |
| `X402_PRECIO` | Precio por consulta en USDC (vacío = `$0.01`) |
| `X402_FACILITATOR_URL` | Facilitador x402 (vacío = `https://x402.org/facilitator`) |
| `PORT` | Puerto del servidor de riesgo (vacío = 4020) |

Copiá `.env.example` a `.env` y llenalas.

## 3. Cómo correrlo
```bash
npm install
npm run escudo:prueba   # manda un mensaje de prueba
npm run escudo          # arranca el bot
```
Comandos en Telegram: `/start`, `/estado`, `/simular <porcentaje>`.

## Vigilante de salud
Mientras corre, el Escudo revisa la salud cada `ESCUDO_INTERVALO_S` segundos y avisa **solo cuando cambia el nivel** (no en cada revisión):
- 🟡 baja de 150 % → amarillo
- 🔴 baja de 125 % → rojo (se liquida en 120 %)
- 🟢 vuelve a 150 % o más → recuperado

## Abono automático
Si la salud baja de **125 %** (rojo, configurable con `ESCUDO_UMBRAL_ROJO_BP`), el Escudo calcula cuánto abonar para volver a **150 %** (o al umbral amarillo si es mayor) (`abonoParaSalud`), revisa que la reserva tenga ese USDC (`saldoUsdc`) y paga con `pagar` firmando con la reserva. Te manda el enlace de Stellar Expert. Después espera `ESCUDO_ENFRIAMIENTO_S` antes de poder abonar otra vez, para no pagar doble. Si `ESCUDO_ABONO_AUTO` no es `on`, solo avisa cuánto habría que abonar.

## Simular caída
`/simular 25` muestra cómo quedaría la salud si el BTC cae 25 % (`saludTrasCaida`) y qué haría el Escudo. Es solo una simulación: no manda ninguna transacción. (El precio real lo controla el oráculo de Writz, por eso la caída se simula.)

## Consulta de riesgo pagada (x402)
Un servidor HTTP pequeño que vende la consulta de riesgo de un préstamo, pagada por uso con [x402](https://x402.org) en Stellar testnet (USDC de prueba, esquema `exact` con `ExactStellarScheme`).

```bash
npm run escudo:riesgo   # escucha en http://localhost:4020
```

`GET /riesgo/:txid` (txid de 64 caracteres hex):
1. Sin pago responde **402** con el encabezado `PAYMENT-REQUIRED` (qué se cobra, a quién y en qué red).
2. El cliente firma el pago y repite la consulta con el encabezado `PAYMENT-SIGNATURE`.
3. El facilitador revisa el pago. Si el préstamo existe, se cobra y responde **200** con el encabezado `PAYMENT-RESPONSE` (hash del pago) y este JSON:

```json
{ "txid": "ab…", "saludBp": 14000, "saludPct": "140.00 %", "semaforo": "amarillo",
  "precioLiquidacionUsdc": "60000", "deudaUsdc": "50000", "estado": "Active" }
```

`precioLiquidacionUsdc` es el precio del BTC (USDC por 1 BTC) al que se liquidaría (`precioLiquidacion`). Si el préstamo no existe responde 404 y **no cobra**. Un cliente de prueba se puede hacer con `@x402/fetch` + `@x402/stellar/exact/client`.

## Publicarlo (después)
Para que corra siempre, se puede subir a **Render gratis** como servicio web con el comando `npm run escudo` y las variables de arriba en su panel. Si hay `PORT`, el bot abre `GET /salud` (responde `ok`), y con `RENDER_EXTERNAL_URL` o `ESCUDO_KEEPALIVE_URL` se hace ping solo cada `ESCUDO_KEEPALIVE_S` segundos (600 por defecto) para que Render no lo duerma. El plan gratis igual puede reiniciar de vez en cuando. Solo una copia del bot a la vez (si no, Telegram da error 409 en `getUpdates`).
Guía paso a paso: [DESPLIEGUE.md](DESPLIEGUE.md) (blueprint en `escudo/render.yaml`).

## Pruebas
`npm test` corre las pruebas en `tests/escudo-*.test.ts` sin red (Telegram, Writz y el facilitador x402 simulados).
