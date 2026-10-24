// Módulo Writz de Caja Tica. La web (Juliana) y el Escudo (Raúl) solo usan estas funciones.
// Formato de datos: ver writz/README.md.
import { Account, BASE_FEE, Contract, Keypair, TransactionBuilder, nativeToScVal, rpc, scValToNative, xdr, Address } from "@stellar/stellar-sdk";
import { WRITZ, expertTx } from "./config.js";
import { semaforo, stroopsAUsdc, usdcAStroops, enRiesgoDeLiquidacion, type Semaforo } from "./units.js";

export interface Prestamo {
  txid: string;            // txid del depósito BTC, orden interno (hex). Es el "id" del préstamo.
  dueno: string;           // G... que depositó
  btcSats: string;         // colateral en satoshis (string para no perder precisión)
  deudaStroops: string;    // deuda USDC en stroops (7 decimales)
  deudaUsdc: string;       // misma deuda legible, ej. "12.5"
  estado: "Active" | "Closed" | "Liquidated";
  timelockHeight: number;
  saludBp: number | null;  // 15000 = 150 %. null si no hay deuda
  semaforo: Semaforo;
  enRiesgo: boolean;       // saludBp < 12000
}

export interface ResultadoTx { hash: string; enlace: string; }

/** Quién firma: una llave secreta (scripts / Escudo) o una función externa (Freighter en la web). */
export type Firmante =
  | { secret: string }
  | { publicKey: string; firmar: (xdrSinFirmar: string, passphrase: string) => Promise<string> };

export interface Deps { server?: rpc.Server; }

const lend = () => new Contract(WRITZ.contracts.writzLend);
const srv = (d?: Deps) => d?.server ?? new rpc.Server(WRITZ.rpcUrl);
const bytes32 = (hex: string) => { const b = Buffer.from(hex, "hex"); if (b.length !== 32) throw new Error("txid debe tener 32 bytes hex"); return nativeToScVal(b); };
const i128 = (v: bigint) => nativeToScVal(v, { type: "i128" });
const pk = (f: Firmante) => ("secret" in f ? Keypair.fromSecret(f.secret).publicKey() : f.publicKey);

async function simular(method: string, args: xdr.ScVal[], d?: Deps): Promise<any> {
  const tx = new TransactionBuilder(new Account(Keypair.random().publicKey(), "0"), { fee: BASE_FEE, networkPassphrase: WRITZ.networkPassphrase })
    .addOperation(lend().call(method, ...args)).setTimeout(30).build();
  const sim = await srv(d).simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(`${method}: ${sim.error}`);
  return sim.result ? scValToNative(sim.result.retval) : undefined;
}

export async function enviar(f: Firmante, method: string, args: xdr.ScVal[], d?: Deps, contractId: string = WRITZ.contracts.writzLend): Promise<ResultadoTx> {
  const s = srv(d);
  const cuenta = await s.getAccount(pk(f));
  let tx = new TransactionBuilder(cuenta, { fee: "1000000", networkPassphrase: WRITZ.networkPassphrase })
    .addOperation(new Contract(contractId).call(method, ...args)).setTimeout(120).build();
  tx = await s.prepareTransaction(tx);
  if ("secret" in f) tx.sign(Keypair.fromSecret(f.secret));
  else tx = TransactionBuilder.fromXDR(await f.firmar(tx.toXDR(), WRITZ.networkPassphrase), WRITZ.networkPassphrase) as typeof tx;
  const sent = await s.sendTransaction(tx);
  if (sent.status === "ERROR") throw new Error(`${method}: envío rechazado ${JSON.stringify(sent.errorResult?.result().switch().name)}`);
  for (let i = 0; i < 30; i++) {
    const r = await s.getTransaction(sent.hash);
    if (r.status === rpc.Api.GetTransactionStatus.SUCCESS) return { hash: sent.hash, enlace: expertTx(sent.hash) };
    if (r.status === rpc.Api.GetTransactionStatus.FAILED) throw new Error(`${method}: falló en cadena ${expertTx(sent.hash)}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`${method}: sin confirmar ${expertTx(sent.hash)}`);
}

/** Salud en bp (15000 = 150 %). null si no hay deuda. Lanza error si el préstamo no existe. */
export async function salud(txid: string, d?: Deps): Promise<number | null> {
  try { return Number(await simular("get_health_ratio_bp", [bytes32(txid)], d)); }
  catch (e: any) {
    const p = await simular("get_position", [bytes32(txid)], d);
    if (p && BigInt(p.usdc_debt) === 0n) return null;
    throw e;
  }
}

/** Lee el préstamo (posición) por txid. null si no existe. */
export async function leerPrestamo(txid: string, d?: Deps): Promise<Prestamo | null> {
  const p = await simular("get_position", [bytes32(txid)], d);
  if (!p) return null;
  const deuda = BigInt(p.usdc_debt);
  const estado = (Array.isArray(p.status) ? p.status[0] : p.status?.tag ?? p.status) as Prestamo["estado"];
  const h = deuda === 0n || estado !== "Active" ? null : await salud(txid, d);
  return {
    txid, dueno: p.depositor, btcSats: BigInt(p.btc_satoshis).toString(), deudaStroops: deuda.toString(),
    deudaUsdc: stroopsAUsdc(deuda), estado, timelockHeight: Number(p.timelock_height),
    saludBp: h, semaforo: semaforo(h), enRiesgo: enRiesgoDeLiquidacion(h),
  };
}

/** Pide prestado `monto` USDC (string "10.5" o número) contra el préstamo `txid`. Firma el dueño. */
export async function pedirPrestamo(monto: string | number, txid: string, f: Firmante, d?: Deps): Promise<ResultadoTx> {
  return enviar(f, "borrow", [new Address(pk(f)).toScVal(), bytes32(txid), i128(usdcAStroops(monto))], d);
}

/** Abona `monto` USDC. `desdeCuenta` puede ser cualquier cuenta (ej. la reserva del Escudo). */
export async function pagar(monto: string | number, txid: string, desdeCuenta: Firmante, d?: Deps): Promise<ResultadoTx> {
  return enviar(desdeCuenta, "repay", [new Address(pk(desdeCuenta)).toScVal(), bytes32(txid), i128(usdcAStroops(monto))], d);
}

/** Saldo USDC de prueba de una cuenta, en stroops. */
export async function saldoUsdc(cuenta: string, d?: Deps): Promise<bigint> {
  const tx = new TransactionBuilder(new Account(Keypair.random().publicKey(), "0"), { fee: BASE_FEE, networkPassphrase: WRITZ.networkPassphrase })
    .addOperation(new Contract(WRITZ.contracts.usdc).call("balance", new Address(cuenta).toScVal())).setTimeout(30).build();
  const sim = await srv(d).simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
  return BigInt(scValToNative(sim.result!.retval));
}

/** Estado del pool (liquidez, total prestado). */
export const estadoProtocolo = (d?: Deps) => simular("get_protocol_state", [], d);
export const tasaPrestamoBp = async (d?: Deps) => Number(await simular("get_borrow_rate_bp", [], d));

/** Prueba SPV del relayer para un txid de Signet (orden display). */
export async function pruebaSpv(txidDisplay: string, confirmaciones = WRITZ.minConfirmations) {
  const r = await fetch(`${WRITZ.relayerUrl}/spv-proof/${txidDisplay}?confirmations=${confirmaciones}`);
  const j = await r.json();
  if (!r.ok) throw Object.assign(new Error(`relayer ${r.status}: ${j.error ?? JSON.stringify(j)}`), { status: r.status, body: j });
  return j as { txid: string; sorobanArgs: { block_hash: string; merkle_proof: string[]; tx_index: number; raw_tx: string; min_confirmations: number } };
}

/** Registra el depósito BTC en writz-lend. Devuelve el txid (orden interno) que identifica el préstamo. */
export async function depositar(
  p: { txidDisplay: string; scriptPubKeyHex: string; timelockHeight: number; userPubkeyHex: string; keySig: Uint8Array },
  f: Firmante, d?: Deps,
): Promise<ResultadoTx & { txid: string }> {
  const a = (await pruebaSpv(p.txidDisplay)).sorobanArgs;
  const h = (x: string) => nativeToScVal(Buffer.from(x, "hex"));
  const r = await enviar(f, "deposit", [
    new Address(pk(f)).toScVal(), h(a.block_hash), xdr.ScVal.scvVec(a.merkle_proof.map(h)),
    nativeToScVal(a.tx_index, { type: "u32" }), h(a.raw_tx), h(p.scriptPubKeyHex),
    nativeToScVal(p.timelockHeight, { type: "u32" }), h(p.userPubkeyHex), nativeToScVal(Buffer.from(p.keySig)),
  ], d);
  return { ...r, txid: Buffer.from(p.txidDisplay, "hex").reverse().toString("hex") };
}
