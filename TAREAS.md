# Tareas de QuickChain: presupuesto con tope para agentes de IA

Divididas **por funcionalidad, no por persona**. Cualquiera agarra cualquiera: comentá "la agarro" en su issue. Entrega en APEX: **lunes 26-10-2026 antes de las 11:30 a.m. (hora CR)**. Todos los miembros deben tener commits.

| # | Tarea | Listo cuando |
|---|---|---|
| 1 | **Contrato Soroban de presupuesto**: `crear_presupuesto(tope, periodo, agente)`, `gastar`, `renovar`, `cancelar` | Pruebas: `gastar` rechaza si pasa el tope o el periodo; solo el agente autorizado gasta; desplegado en testnet con enlace a Stellar Expert |
| 2 | **Cliente del agente**: recibe 402, paga desde el presupuesto, repite la llamada | Prueba: 402 → pago → 200; si el contrato rechaza, el cliente para y lo informa |
| 3 | **API de prueba con x402**, reusando `escudo/riesgo-server.ts` | Responde 402 sin pago y 200 con pago válido; prueba automatizada |
| 4 | **Pantalla web** (`/web`): login Cavos, poner tope, ver gastado, cancelar | Se entra con email, se crea un presupuesto en testnet y se ve el gasto |
| 5 | **Demo**: el agente hace varias llamadas, llega al tope y lo frenan | Script que corre de punta a punta; cada tx con enlace a Stellar Expert en el README |
| 6 | **README, pitch y video** sin Writz ni Bitcoin; sacar ese código del repo | Video 3 min pitch + 2 min demo subido; link en README y en APEX |

## Reglas
- Una rama y un PR por tarea. Nada directo a `main`.
- **Nunca subir llaves, seeds ni `.env`.** Solo `.env.example`.
- USDC en stroops (7 decimales, `bigint`).
- Cada cifra lleva su fuente; si no hay fuente, se quita.
- No presentarlo como inversión ni como libre de riesgo (Ley 10.961, SUGEF).
