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

Copiá `.env.example` a `.env` y llenalas.

## 3. Cómo correrlo
```bash
npm install
npm run escudo:prueba   # manda un mensaje de prueba
npm run escudo          # arranca el bot
```
Comandos en Telegram: `/start`, `/estado`.

## Publicarlo (después)
Para que corra siempre, se puede subir a **Render** o **Railway** como "worker" (no necesita puerto) con el comando `npm run escudo` y las variables de arriba en su panel. Solo una copia del bot a la vez (si no, Telegram da error 409 en `getUpdates`).

## Pruebas
`npm test` corre las pruebas en `tests/escudo-*.test.ts` sin red (Telegram y Writz simulados).
