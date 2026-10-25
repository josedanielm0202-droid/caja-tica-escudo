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
| `RESERVA_PUBLIC` / `RESERVA_SECRET` | Cuenta de reserva USDC del Escudo (la da José, nunca en la repo) |

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
Si la salud baja de **125 %** (rojo), el Escudo calcula cuánto abonar para volver a **150 %** (`abonoParaSalud`), revisa que la reserva tenga ese USDC (`saldoUsdc`) y paga con `pagar` firmando con la reserva. Te manda el enlace de Stellar Expert. Después espera `ESCUDO_ENFRIAMIENTO_S` antes de poder abonar otra vez, para no pagar doble. Si `ESCUDO_ABONO_AUTO` no es `on`, solo avisa cuánto habría que abonar.

## Simular caída
`/simular 25` muestra cómo quedaría la salud si el BTC cae 25 % (`saludTrasCaida`) y qué haría el Escudo. Es solo una simulación: no manda ninguna transacción. (El precio real lo controla el oráculo de Writz, por eso la caída se simula.)

## Publicarlo (después)
Para que corra siempre, se puede subir a **Render** o **Railway** como "worker" (no necesita puerto) con el comando `npm run escudo` y las variables de arriba en su panel. Solo una copia del bot a la vez (si no, Telegram da error 409 en `getUpdates`).
Guía paso a paso: [DESPLIEGUE.md](DESPLIEGUE.md) (blueprint en `escudo/render.yaml`).

## Pruebas
`npm test` corre las pruebas en `tests/escudo-*.test.ts` sin red (Telegram y Writz simulados).
