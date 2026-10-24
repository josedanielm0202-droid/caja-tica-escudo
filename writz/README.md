# Módulo Writz (`/writz`) — formato de datos compartido

Dueño: José. Juliana (`/web`) y Raúl (`/escudo`) **no llaman a Writz directo**: importan de `writz/client.ts`.

## Unidades (regla única para todo el equipo)
| Dato | Unidad | Ejemplo |
|---|---|---|
| USDC en contratos | **stroops**, entero, 7 decimales (`bigint` o string) | `125000000` = 12.5 USDC |
| USDC para mostrar | string decimal | `"12.5"` (usar `stroopsAUsdc`) |
| BTC | **satoshis** (string) | `"20000"` = 0.0002 BTC |
| Salud | **basis points** (`number`), `15000` = 150 % | `null` = sin deuda |
| Liquidación | salud `< 12000` (120 %) | `enRiesgo: true` |
| Préstamo máximo | `borrow` exige salud ≥ 15000 ⇒ **LTV máx ≈ 66 %** (`MAX_LTV_BP = 6666`) | |
| id del préstamo | `txid` del depósito BTC, hex de 32 bytes, **orden interno** (inverso al explorador) | `invertirHex()` convierte |

## Semáforo del panel (boceto)
- `verde`: salud ≥ 150 % o sin deuda
- `amarillo`: 125 % – 150 %
- `rojo`: < 125 % (y `enRiesgo` si < 120 %)

## Funciones
```ts
import { leerPrestamo, pedirPrestamo, pagar, salud, saldoUsdc, estadoProtocolo } from "../writz/client.js";

leerPrestamo(txid): Promise<Prestamo | null>
salud(txid): Promise<number | null>                       // bp
pedirPrestamo(monto, txid, firmante): Promise<ResultadoTx>  // borrow, firma el dueño
pagar(monto, txid, desdeCuenta): Promise<ResultadoTx>       // repay, cualquier cuenta (reserva del Escudo)
```
`monto` es USDC legible (`"10"` o `10.5`); se valida y convierte a stroops por dentro (monto ≤ 0, texto o >7 decimales => error).

```ts
interface Prestamo {
  txid: string; dueno: string; btcSats: string; deudaStroops: string; deudaUsdc: string;
  estado: "Active" | "Closed" | "Liquidated"; timelockHeight: number;
  saludBp: number | null; semaforo: "verde" | "amarillo" | "rojo"; enRiesgo: boolean;
}
interface ResultadoTx { hash: string; enlace: string }   // enlace = Stellar Expert (historial)
type Firmante = { secret: string }                        // Escudo / scripts (llave en .env)
              | { publicKey: string; firmar(xdr, passphrase): Promise<string> }  // web: Freighter signTransaction
```
Ayudas puras en `units.ts`: `maximoPrestable`, `precioLiquidacion`, `ltvBp`, `saludTrasCaida` (botón "Simular caída"), `abonoParaSalud` (abono automático del Escudo).

## Contratos (testnet, verificados contra `testnet.json` de Writz el 24-oct)
Ver `config.ts`. writz-lend `CCMSOCBV…6ZZK`, bitcoin-spv `CAHHY4S4…MCLP`, USDC `CBIELTK6…DAMA` (asset `USDC:GBBD47IF…FLA5`, la cuenta necesita trustline), protocol BTC pubkey `03d2f069…b70d`, 1 confirmación, mínimo 5 000 sats.

## Flujo de depósito (scripts)
1. `npm run boveda` → crea la llave BTC (WIF solo en `.env`) y muestra la dirección de la bóveda `tb1q…`.
2. Mandar ≥ 5 000 sats de Signet a esa dirección (faucet con captcha: hacerlo en el navegador).
3. Con 1 confirmación: `npm run depositar -- <txid display>` → prueba SPV del relayer + `key_sig` BIP-137 + `deposit`. Guarda `LOAN_TXID` en `.env`.
4. `npm run prestar-pagar -- 5 1` y `npm run leer`.

**Plan B:** si `deposit` falla, abrir la posición en https://testnet.writz.xyz y poner su txid en `LOAN_TXID`; todo lo demás funciona igual (lecturas por txid).

Transacciones reales del demo: ver [docs/transacciones.md](../docs/transacciones.md).
