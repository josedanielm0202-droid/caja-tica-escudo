# Desplegar el Escudo en Render

Guía corta para dejar el bot corriendo siempre. Es una demo en testnet: no es una inversión ni algo sin riesgo.

## Antes de empezar
1. **Token del bot**: en Telegram, @BotFather, `/newbot`. El token es `TELEGRAM_BOT_TOKEN` (secreto).
2. **Chat id**: escribile al bot y abrí `https://api.telegram.org/bot<TOKEN>/getUpdates`. El número en `"chat":{"id": ...}` es `TELEGRAM_CHAT_ID`.
3. **LOAN_TXID**: el txid (orden interno, 64 hex) del préstamo a vigilar. Lo da José.
4. **Llaves de la reserva**: `RESERVA_PUBLIC` y `RESERVA_SECRET`. José las pasa **por privado** (nunca por el chat del equipo, nunca en GitHub).

## Pasos en Render
1. En Render: **New > Blueprint**, elegí esta repo y en **Blueprint Path** poné `escudo/render.yaml`.
2. Render crea un **Background Worker** (no necesita puerto) que corre `npm ci` y luego `npm run escudo`.
3. Render te pide las variables (están con `sync: false`, sin valores en la repo). Pegá los valores de arriba.
4. Para que abone solo, poné `ESCUDO_ABONO_AUTO=on` (exactamente `on`). Cualquier otra cosa = solo avisa.
5. `ESCUDO_INTERVALO_S` y `ESCUDO_ENFRIAMIENTO_S` se pueden dejar vacías (30 y 600 segundos).
6. Deploy. En los logs debe salir `Escudo: revisando cada 30 s, abono automático ENCENDIDO.`
7. En Telegram mandá `/estado` para probar.

## Importante
- **Solo una instancia.** El blueprint ya tiene `numInstances: 1`. No lo corrás a la vez en tu compu y en Render: Telegram da error 409 en `getUpdates`.
- Nunca subás `.env` ni llaves a la repo.
- El worker de Render es de pago (plan starter). Si se usa otro plan o Railway, el comando es el mismo: `npm run escudo`.
