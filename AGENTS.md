# Instrucciones para asistentes de IA (Grok Bot, Cursor, Copilot, etc.)

Proyecto: **Caja Tica + Escudo**. "Usá tu Bitcoin sin tener que soltarlo."
Reto: Pura Vida Ideathon | Build on Stellar (APEX). Entrega: lunes 26 de octubre de 2026 antes de las 12:00 md (hora de Costa Rica).
Bounty de Writz: el proyecto debe usar Writz de verdad en testnet.

## Cómo usar este archivo
Cuando alguien diga "soy <nombre>, ¿qué tengo que hacer?", buscá su nombre abajo, explicale su rol en palabras sencillas (español de Costa Rica), dale sus primeras 3 tareas concretas y ayudale a hacerlas en su carpeta. Cada persona trabaja en su propia rama (`rol/<nombre>`) y abre un pull request hacia `main`. Commits pequeños y frecuentes: el reto revisa que haya commits del equipo durante el evento.

## La idea en corto
Comercios y ahorristas en Costa Rica que tienen BTC lo dejan en una bóveda de Writz (Bitcoin Signet) y piden prestado USDC en Stellar para pagar planilla en vez de vender. El **Escudo** vigila la salud del préstamo, manda alertas por Telegram y puede hacer un abono automático desde una reserva en USDC. El retiro a colones es simulado. Nunca presentar como inversión ni como algo sin riesgo (Ley 10.961, SUGEF).

## Datos técnicos (Stellar testnet)
- `writz-lend`: CCMSOCBVX2S645MQFFXJRHVHRWH2NY62KLOJXNDYFOJRYHIC47EO6ZZK (verificar contra testnet.json de Writz)
- `bitcoin-spv`: CAHHY4S4WCIFU4LBSKBI3IP6A4QYR2COV6EACDEBXGPJFDWBJWGOMCLP
- USDC de prueba: CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA (7 decimales)
- Relayer: https://api.testnet.writz.xyz (`/spv-proof/:txid`). BTC de prueba: signetfaucet.com
- Funciones: `deposit`, `borrow`, `repay` (cualquier cuenta puede pagar), `get_health_ratio_bp` (liquida en 12000), `get_position`.
- LTV máximo 66%. Liquidación por debajo de 120%. El oráculo solo lo controla el admin: la caída de precio se simula con el botón "Simular caída" del Escudo.
- Plan B: si `deposit` con `key_sig` no funciona para el sábado 22:00, abrir la posición en la app de Writz y leerla por txid.

## Roles (asignados al azar)

### José: Contratos y Writz (`/contracts`, `/writz`)
Conectar la app con Writz en testnet (depositar, pedir prestado, pagar, leer salud), escribir las pruebas y configurar CI (GitHub Actions). Responsable del plan B.
Primeras tareas: 1) script que lea `get_position` y `get_health_ratio_bp` de una cuenta; 2) flujo `borrow` y `repay`; 3) mínimo 8 pruebas + CI en verde.

### Juliana: App y pantallas (`/web`)
Web responsive (funciona en celular) según el boceto: inicio, conectar billetera (Freighter/Passport), panel con medidor verde/amarillo/rojo, pedir préstamo con slider de LTV y precio de liquidación, planilla/retiro a colones simulado, historial con enlaces a Stellar Expert y feed en vivo.
Primeras tareas: 1) crear el proyecto web y el diseño base; 2) conexión de billetera; 3) panel con datos de ejemplo, luego conectarlo a lo de José.

### Raúl: Escudo y alertas (`/escudo`)
Bot que vigila la salud del préstamo, alertas por Telegram, abono automático desde la reserva USDC con `repay`, y botón/endpoint "Simular caída". Extra si sobra tiempo: consulta de riesgo pagada por uso con x402.
Primeras tareas: 1) bot de Telegram que mande un mensaje de prueba; 2) revisar la salud cada X segundos y alertar por umbrales; 3) abono automático + simulación de caída.

### Josué: Producto, pitch y entrega (`/docs`, README)
README con lista "Qué cumple", diagrama de transacciones, evidencia del problema y nota legal; pitch de 3 min y demo de 2 min; subir el proyecto a APEX antes del mediodía del lunes. Coordina que todo se integre.
Primeras tareas: 1) README con estructura y checklist; 2) guion del pitch y del demo; 3) crear el proyecto en APEX e invitar al equipo.

## Reglas para todos
- Nunca subir llaves privadas, semillas ni archivos `.env` (usar `.env.example`).
- Cada transacción del demo debe tener su enlace a Stellar Expert.
- Domingo en la noche: prueba completa del flujo con todo el equipo.
