# Tareas: presupuesto prepagado para agentes de IA sobre Stellar con x402

Las tareas están divididas **por funcionalidad, no por persona**. No hay dueños: cualquiera agarra cualquier tarea y nadie espera a nadie. Para que eso funcione, primero fijamos las **interfaces** (abajo) y cada tarea trabaja contra ellas, con un mock mientras la parte real no existe.

## Flujo (resumen)
1. El usuario entra con **Cavos** (login con email, wallet embebida; sin seed phrase ni Freighter). Docs: https://docs.cavos.xyz/ y https://docs.cavos.xyz/llms-full.txt
2. Bloquea BTC en **Writz** y pide prestado USDC en Stellar testnet (vía `writz/client.ts`, código que ya existe).
3. Con ese USDC fondea el presupuesto del agente: `approve` del token Soroban (SEP-41) al proveedor de la API, con tope (`amount`) y vencimiento (`expiration_ledger`).
4. El **gate x402** (`escudo/riesgo-server.ts`) revisa en Soroban si el agente tiene suscripción/presupuesto activo. Si sí: 200 sin pago por llamada. Si no: el 402 normal con esquema `exact`, pago por llamada.
5. Un **keeper (cobrador)** cobra cada periodo con `transfer_from`, **por fuera** del facilitador de OpenZeppelin (el facilitador solo soporta `exact`/transfer).
6. El **Escudo** (monitor de salud + Telegram + abono automático, ya existe) protege el préstamo de Writz que respalda el presupuesto.
7. Demo: 3 llamadas pagadas → suscribirse → 10 llamadas gratis, cada tx con su enlace a Stellar Expert.

## Interfaces fijas (no se cambian sin avisar en el issue)
Archivo nuevo `suscripcion/tipos.ts` (lo crea quien agarre T0; mientras tanto, copiá esto tal cual):

```ts
// Montos en stroops de USDC (7 decimales): 1 USDC = 10_000_000n.
export interface ResultadoTx { hash: string; enlace: string } // enlace = Stellar Expert testnet

export interface Suscripcion {
  /** ¿El agente tiene presupuesto activo (allowance >= precio del periodo y sin vencer, y periodo pagado)? */
  isActive(agente: string): Promise<boolean>;
  /** El agente (o el usuario vía Cavos) hace approve al proveedor: tope total y periodo en ledgers. */
  subscribe(agente: string, montoPorPeriodo: bigint, periodoLedgers: number): Promise<ResultadoTx>;
  /** El keeper cobra el periodo con transfer_from. Si no hay allowance, no cobra y devuelve null. */
  charge(agente: string): Promise<ResultadoTx | null>;
}

export interface Registro { // lo que lee el panel web
  suscriptores(): Promise<{ agente: string; activa: boolean; venceLedger: number }[]>;
  cobros(): Promise<{ agente: string; monto: bigint; tx: ResultadoTx; fecha: string }[]>;
  llamadas(): Promise<{ agente: string; pagada: boolean; tx?: ResultadoTx; fecha: string }[]>;
}
```

`suscripcion/mock.ts` implementa todo en memoria (sin red), para que el gate, el keeper, el agente demo y el panel avancen en paralelo. Cuando T1 esté lista, se cambia el mock por la real con una variable de entorno (`SUSCRIPCION=mock|soroban`).

## Tareas
| # | Tarea | Depende de (solo la interfaz) | Listo cuando |
|---|---|---|---|
| T0 | Interfaces + mock (`suscripcion/tipos.ts`, `suscripcion/mock.ts`) con pruebas | nada | Pruebas del mock en verde; las demás tareas lo importan |
| T1 | Suscripción on-chain: `subscribe` (approve con tope + `expiration_ledger`), `isActive` (lee `allowance` y último cobro) sobre el USDC SEP-41 de testnet | interfaz | `subscribe` real en testnet con enlace en `docs/transacciones.md`; pruebas con `LIVE=1` |
| T2 | Keeper / cobrador (`scripts/cobrador.ts`): cada periodo llama `charge` = `transfer_from` del agente al proveedor. Fuera del facilitador. Si falla, la suscripción vence y el gate vuelve a pedir pago (falla segura) | interfaz | Un cobro real en testnet con enlace; prueba con mock |
| T3 | Gate x402 en `escudo/riesgo-server.ts`: si `isActive(agente)` → 200 sin pago; si no → 402 `exact` como hoy. Definir cómo se identifica al agente (p. ej. firma de un reto o header con su dirección + prueba) y documentarlo | interfaz | Pruebas: suscrito pasa, no suscrito recibe 402, pago `exact` sigue funcionando |
| T4 | Agente demo (`scripts/agente-demo.ts`): 3 llamadas pagadas → `subscribe` → 10 llamadas gratis; imprime cada enlace a Stellar Expert | interfaz | Corre contra mock y contra testnet |
| T5 | Login con Cavos en `/web` (email, wallet embebida, sin Freighter), firma Soroban con auth entries | nada | Se entra con email y se firma una tx de testnet desde la web |
| T6 | Panel web: suscriptores, cobros y llamadas (lee `Registro`) | interfaz | Pantalla con datos del mock y luego reales, cada tx con su enlace |
| T7 | Integración Writz → presupuesto: el USDC prestado (`pedirPrestamo` en `writz/client.ts`) fondea el `subscribe`; el Escudo vigila ese préstamo. Requisito del bounty: integración real en testnet | `writz/client.ts` (ya existe) | Tx `borrow` + `approve` encadenadas en testnet, con enlaces |
| T8 | README y docs (arquitectura, diagrama, cómo correr, nota legal) | nada | README al día con lo que de verdad corre |
| T9 | Pitch (3 min) + demo (2 min) + entrega en APEX | nada | Video subido y link en el README y en APEX antes de las 11:30 a.m. del lunes 26 |
| T10 | Corrida end-to-end en testnet que llena `docs/transacciones.md` (Cavos → Writz borrow → approve → 3 pagadas → 10 gratis → cobro del keeper → health) | T1–T7 reales | Tabla completa, cada fila con enlace a Stellar Expert |

## Reglas del equipo
- **Antes de empezar, reclamá la tarea** comentando en su issue de GitHub ("la agarro"). Si alguien ya la reclamó, hablen en el issue.
- Una rama propia por tarea y **un PR por tarea**, titulado `T#: ...`. Nada directo a `main`.
- **Nunca subir llaves ni `.env`.** Solo `.env.example`.
- Todo acceso a Writz pasa por `writz/client.ts`.
- USDC en **stroops de 7 decimales** (`bigint`). Salud del préstamo en **basis points** (bp).
- Cada tx que mostremos lleva su **enlace a Stellar Expert** (testnet).
- Nunca presentar esto como inversión ni como algo libre de riesgo. No somos entidad regulada por SUGEF (Ley 10.961). El retiro a colones es **simulado**.
- Regla de APEX: **todos los integrantes tienen que tener commits durante la ideathon.** Si no tenés ninguno todavía, agarrá una tarea chica (T0, T6 o T8).
