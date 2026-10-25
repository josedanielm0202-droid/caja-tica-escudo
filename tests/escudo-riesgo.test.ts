// Pruebas de la consulta de riesgo con x402 (facilitador simulado, sin red).
import { describe, it, expect, vi, afterEach } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { Keypair } from "@stellar/stellar-sdk";
import { decodePaymentRequiredHeader, decodePaymentResponseHeader, encodePaymentSignatureHeader } from "@x402/core/http";
import type { FacilitatorClient } from "@x402/core/server";
import { crearServidorRiesgo, calcularRiesgo, leerConfigRiesgo, RED_X402, type DepsRiesgo } from "../escudo/riesgo.js";
import type { Prestamo } from "../writz/client.js";

const TXID = "ab".repeat(32);
const PAY_TO = Keypair.random().publicKey();
const prestamo = (o: Partial<Prestamo> = {}): Prestamo => ({
  txid: TXID, dueno: "GDEMO", btcSats: "100000000", deudaStroops: "500000000000", deudaUsdc: "50000",
  estado: "Active", timelockHeight: 1, saludBp: 14000, semaforo: "amarillo", enRiesgo: false, ...o,
});

const facilitador = (valido = true, cobra = true) => ({
  getSupported: vi.fn(async () => ({ kinds: [{ x402Version: 2, scheme: "exact", network: RED_X402, extra: { areFeesSponsored: true } }], extensions: [], signers: {} })),
  verify: vi.fn(async () => (valido ? { isValid: true, payer: "GPAGADOR" } : { isValid: false, invalidReason: "invalid_signature" })),
  settle: vi.fn(async () => (cobra ? { success: true, transaction: "abc123", network: RED_X402, payer: "GPAGADOR" } : { success: false, errorReason: "fallo", transaction: "", network: RED_X402 })),
}) satisfies FacilitatorClient;

let srv: Server | undefined;
afterEach(() => { srv?.close(); srv = undefined; });
async function arrancar(o: Partial<DepsRiesgo> = {}) {
  const d: DepsRiesgo = { config: { payTo: PAY_TO, precio: "$0.01" }, facilitador: facilitador(), leerPrestamo: vi.fn(async () => prestamo()), ...o };
  srv = crearServidorRiesgo(d);
  await new Promise<void>((r) => srv!.listen(0, r));
  return { d, base: `http://127.0.0.1:${(srv!.address() as AddressInfo).port}` };
}
const firmar = (accepted: unknown) => encodePaymentSignatureHeader({ x402Version: 2, accepted: accepted as any, payload: { transaction: "AAAA" } });

describe("calcularRiesgo", () => {
  it("salud, color y precio de liquidación", () => {
    // 50000 USDC de deuda con 1 BTC: liquida a 50000 * 1.2 = 60000 USDC/BTC
    expect(calcularRiesgo(prestamo())).toMatchObject({ saludBp: 14000, saludPct: "140.00 %", semaforo: "amarillo", precioLiquidacionUsdc: "60000" });
  });
  it("sin deuda: sin precio de liquidación", () => {
    expect(calcularRiesgo(prestamo({ deudaStroops: "0", deudaUsdc: "0", saludBp: null, semaforo: "verde" }))).toMatchObject({ saludPct: "sin deuda", precioLiquidacionUsdc: null });
  });
});

describe("leerConfigRiesgo", () => {
  it("pide X402_PAY_TO", () => { expect(() => leerConfigRiesgo({})).toThrow(/X402_PAY_TO/); });
  it("valores por defecto", () => {
    expect(leerConfigRiesgo({ X402_PAY_TO: "G1" })).toEqual({ payTo: "G1", precio: "$0.01", facilitadorUrl: "https://x402.org/facilitator", puerto: 4020 });
  });
  it("usa el env", () => {
    expect(leerConfigRiesgo({ X402_PAY_TO: "G1", X402_PRECIO: "$0.05", X402_FACILITATOR_URL: "http://f", PORT: "8080" })).toMatchObject({ precio: "$0.05", facilitadorUrl: "http://f", puerto: 8080 });
  });
});

describe("GET /riesgo/:txid con x402", () => {
  it("sin pago: 402 con PAYMENT-REQUIRED y no lee el préstamo", async () => {
    const { d, base } = await arrancar();
    const r = await fetch(`${base}/riesgo/${TXID}`);
    expect(r.status).toBe(402);
    const pr = decodePaymentRequiredHeader(r.headers.get("payment-required")!);
    expect(pr.accepts[0]).toMatchObject({ scheme: "exact", network: "stellar:testnet", payTo: PAY_TO, amount: "100000" });
    expect(d.leerPrestamo).not.toHaveBeenCalled();
  });
  it("con pago válido: 200, JSON de riesgo y PAYMENT-RESPONSE", async () => {
    const { d, base } = await arrancar();
    const pr = decodePaymentRequiredHeader((await fetch(`${base}/riesgo/${TXID}`)).headers.get("payment-required")!);
    const r = await fetch(`${base}/riesgo/${TXID}`, { headers: { "PAYMENT-SIGNATURE": firmar(pr.accepts[0]) } });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ txid: TXID, saludBp: 14000, semaforo: "amarillo", precioLiquidacionUsdc: "60000" });
    expect(decodePaymentResponseHeader(r.headers.get("payment-response")!)).toMatchObject({ success: true, transaction: "abc123" });
    expect(d.facilitador.verify).toHaveBeenCalledOnce();
    expect(d.facilitador.settle).toHaveBeenCalledOnce();
  });
  it("pago inválido: 402 y no cobra", async () => {
    const f = facilitador(false);
    const { base } = await arrancar({ facilitador: f });
    const pr = decodePaymentRequiredHeader((await fetch(`${base}/riesgo/${TXID}`)).headers.get("payment-required")!);
    const r = await fetch(`${base}/riesgo/${TXID}`, { headers: { "PAYMENT-SIGNATURE": firmar(pr.accepts[0]) } });
    expect(r.status).toBe(402);
    expect(f.settle).not.toHaveBeenCalled();
  });
  it("cobro fallido: 402", async () => {
    const { base } = await arrancar({ facilitador: facilitador(true, false) });
    const pr = decodePaymentRequiredHeader((await fetch(`${base}/riesgo/${TXID}`)).headers.get("payment-required")!);
    expect((await fetch(`${base}/riesgo/${TXID}`, { headers: { "PAYMENT-SIGNATURE": firmar(pr.accepts[0]) } })).status).toBe(402);
  });
  it("préstamo que no existe: 404 y no cobra", async () => {
    const f = facilitador();
    const { base } = await arrancar({ facilitador: f, leerPrestamo: vi.fn(async () => null) });
    const pr = decodePaymentRequiredHeader((await fetch(`${base}/riesgo/${TXID}`)).headers.get("payment-required")!);
    expect((await fetch(`${base}/riesgo/${TXID}`, { headers: { "PAYMENT-SIGNATURE": firmar(pr.accepts[0]) } })).status).toBe(404);
    expect(f.settle).not.toHaveBeenCalled();
  });
  it("txid mal formado: 400; otra ruta: 404", async () => {
    const { base } = await arrancar();
    expect((await fetch(`${base}/riesgo/xyz`)).status).toBe(400);
    expect((await fetch(`${base}/otra`)).status).toBe(404);
  });
});
