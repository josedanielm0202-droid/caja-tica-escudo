# Desplegar el Escudo en Render

Guía corta para dejar el bot corriendo siempre. Es una demo en testnet: no es una inversión ni algo sin riesgo.

## Antes de empezar
1. **Token del bot**: en Telegram, @BotFather, `/newbot`. El token es `TELEGRAM_BOT_TOKEN` (secreto).
2. **Chat id**: escribile al bot y abrí `https://api.telegram.org/bot<TOKEN>/getUpdates`. El número en `"chat":{"id": ...}` es `TELEGRAM_CHAT_ID`.
3. **LOAN_TXID**: el txid (orden interno, 64 hex) del préstamo a vigilar. Lo da José.
4. **Llaves de la reserva**: `RESERVA_PUBLIC` y `RESERVA_SECRET`. José las pasa **por privado** (nunca por el chat del equipo, nunca en GitHub).

## Pasos en Render
1. En Render: **New > Blueprint**, elegí esta repo y en **Blueprint Path** poné `escudo/render.yaml`.
2. Render crea un **Web Service gratis** (`plan: free`) que corre `npm ci` y luego `npm run escudo`. El bot abre `GET /salud` en el `PORT` que da Render (responde `ok`) y Render lo usa como health check.
3. Render te pide las variables (están con `sync: false`, sin valores en la repo). Pegá los valores de arriba.
4. Para que abone solo, poné `ESCUDO_ABONO_AUTO=on` (exactamente `on`). Cualquier otra cosa = solo avisa.
5. `ESCUDO_INTERVALO_S` y `ESCUDO_ENFRIAMIENTO_S` se pueden dejar vacías (30 y 600 segundos).
6. Deploy. En los logs debe salir `Escudo: revisando cada 30 s, abono automático ENCENDIDO.`
7. En Telegram mandá `/estado` para probar.

## Importante
- **Solo una instancia.** El blueprint ya tiene `numInstances: 1`. No lo corrás a la vez en tu compu y en Render: Telegram da error 409 en `getUpdates`.
- Nunca subás `.env` ni llaves a la repo.
- **Plan gratis y keep-alive.** El plan gratis duerme el servicio si no recibe visitas en unos 15 minutos. Para evitarlo, el bot se hace ping solo a `${RENDER_EXTERNAL_URL}/salud` cada `ESCUDO_KEEPALIVE_S` segundos (600 por defecto). Render pone `RENDER_EXTERNAL_URL` solo; se puede cambiar con `ESCUDO_KEEPALIVE_URL`. Si el ping falla, solo queda en los logs.
- **Ojo:** aun así el plan gratis puede reiniciar el servicio de vez en cuando (deploys, mantenimiento o límite de horas del mes). El bot vuelve a arrancar solo, pero puede haber unos minutos sin vigilancia.
- En tu compu no pasa nada nuevo: sin `PORT` no abre servidor y sin URL no hace keep-alive. No pongás `PORT` si también corrés `npm run escudo:riesgo` (ese usa `X402_PUERTO`); o usá `ESCUDO_PUERTO` para el Escudo.
- En Railway u otro lado el comando es el mismo: `npm run escudo`.
