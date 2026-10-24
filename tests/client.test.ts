import { describe, it, expect, vi } from "vitest";
import { nativeToScVal, rpc, xdr, Keypair } from "@stellar/stellar-sdk";
import { leerPrestamo, salud } from "../writz/client.js";

const TXID = "11".repeat(32);
const posicion = (deuda: bigint) => xdr.ScVal.scvMap([
  ["btc_satoshis", nativeToScVal(100_000n, { type: "u64" })], ["btc_txid", nativeToScVal(Buffer.from(TXID, "hex"))],
  ["debt_index", nativeToScVal(0n, { type: "i128" })], ["depositor", nativeToScVal(Keypair.random().publicKey(), { type: "address" })],
  ["last_update_ledger", nativeToScVal(1, { type: "u32" })], ["p2wsh_script_pubkey", nativeToScVal(Buffer.alloc(34))],
  ["status", xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Active")])], ["timelock_height", nativeToScVal(332_000, { type: "u32" })],
  ["usdc_debt", nativeToScVal(deuda, { type: "i128" })], ["user_pubkey", nativeToScVal(Buffer.alloc(33, 2))],
].map(([k, v]) => new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol(k as string), val: v as xdr.ScVal })));

function servidorFalso(respuestas: Record<string, xdr.ScVal | "error">) {
  return { simulateTransaction: vi.fn(async (tx: any) => {
    const fn = tx.operations[0].func.invokeContract().functionName().toString();
    const r = respuestas[fn];
    if (r === "error" || !r) return { error: `Error(Contract, #1) ${fn}`, events: [], _parsed: true, id: "", latestLedger: 1 };
    return { result: { retval: r, auth: [] }, latestLedger: 1, events: [], id: "", _parsed: true, transactionData: undefined, minResourceFee: "0" };
  }) } as unknown as rpc.Server;
}

describe("cliente Writz (mock de RPC)", () => {
  it("leerPrestamo arma el formato compartido con semáforo", async () => {
    const server = servidorFalso({ get_position: posicion(350_000_000n), get_health_ratio_bp: nativeToScVal(13_000n, { type: "i128" }) });
    const p = await leerPrestamo(TXID, { server });
    expect(p).toMatchObject({ deudaUsdc: "35", btcSats: "100000", estado: "Active", saludBp: 13_000, semaforo: "amarillo", enRiesgo: false });
  });
  it("leerPrestamo devuelve null si no existe", async () => {
    const server = servidorFalso({ get_position: xdr.ScVal.scvVoid() });
    expect(await leerPrestamo(TXID, { server })).toBeNull();
  });
  it("salud es null cuando no hay deuda", async () => {
    const server = servidorFalso({ get_health_ratio_bp: "error", get_position: posicion(0n) });
    expect(await salud(TXID, { server })).toBeNull();
  });
  it("txid mal formado lanza error", async () => {
    await expect(leerPrestamo("abc", { server: servidorFalso({}) })).rejects.toThrow();
  });
});
