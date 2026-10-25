// Consulta de riesgo pagada por uso con x402 (Stellar testnet).
// GET /riesgo/:txid -> salud, color del semáforo y precio de liquidación.
// Sin pago responde 402 con PAYMENT-REQUIRED. Con PAYMENT-SIGNATURE válido responde 200 y PAYMENT-RESPONSE.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { HTTPFacilitatorClient, x402ResourceServer, type FacilitatorClient } from "@x402/core/server";
import { decodePaymentSignatureHeader, encodePaymentRequiredHeader, encodePaymentResponseHeader } from "@x402/core/http";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import type { Prestamo } from "../writz/client.js";
import { precioLiquidacion, stroopsAUsdc, type Semaforo } from "../writz/units.js";

export const RED_X402 = "stellar:testnet" as const;
export const FACILITADOR_POR_DEFECTO = "https://x402.org/facilitator";
export const PRECIO_POR_DEFECTO = "$0.01";

export interface ConfigRiesgo { payTo: string; precio: string; facilitadorUrl: string; puerto: number; }

export function leerConfigRiesgo(env: Record<string, string | undefined> = process.env): ConfigRiesgo {
  if (!env.X402_PAY_TO) throw new Error("Falta X402_PAY_TO (cuenta G... que recibe los pagos)");
  const puerto = Number(env.PORT ?? env.X402_PUERTO);
  return {
    payTo: env.X402_PAY_TO,
    precio: env.X402_PRECIO?.trim() || PRECIO_POR_DEFECTO,
    facilitadorUrl: env.X402_FACILITATOR_URL?.trim() || FACILITADOR_POR_DEFECTO,
    puerto: Number.isInteger(puerto) && puerto > 0 ? puerto : 4020,
  };
}

export interface Riesgo { txid: string; saludBp: number | null; saludPct: string; semaforo: Semaforo; precioLiquidacionUsdc: string | null; deudaUsdc: string; estado: Prestamo["estado"]; }

/** Arma la respuesta de riesgo de un préstamo (función pura). */
export function calcularRiesgo(p: Prestamo): Riesgo {
  const deuda = BigInt(p.deudaStroops);
  return {
    txid: p.txid, saludBp: p.saludBp,
    saludPct: p.saludBp === null ? "sin deuda" : `${(p.saludBp / 100).toFixed(2)} %`,
    semaforo: p.semaforo,
    precioLiquidacionUsdc: deuda === 0n ? null : stroopsAUsdc(precioLiquidacion(BigInt(p.btcSats), deuda)),
    deudaUsdc: p.deudaUsdc, estado: p.estado,
  };
}

export interface DepsRiesgo {
  config: Pick<ConfigRiesgo, "payTo" | "precio">;
  facilitador: FacilitatorClient;
  leerPrestamo: (txid: string) => Promise<Prestamo | null>;
}

const json = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(body));
};

/** Crea el servidor HTTP (sin escuchar). Probarlo con `.listen(0)`. */
export function crearServidorRiesgo(d: DepsRiesgo): Server {
  const x402 = new x402ResourceServer(d.facilitador).register(RED_X402, new ExactStellarScheme());
  let listo: Promise<void> | null = null;
  const iniciar = () => (listo ??= x402.initialize().catch((e) => { listo = null; throw e; }));

  async function atender(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://localhost");
    const m = /^\/riesgo\/([0-9a-fA-F]{64})$/.exec(url.pathname);
    if (req.method !== "GET" || !url.pathname.startsWith("/riesgo/")) return json(res, 404, { error: "Usá GET /riesgo/:txid" });
    if (!m) return json(res, 400, { error: "txid debe ser 64 caracteres hex" });
    const txid = m[1].toLowerCase();

    await iniciar();
    const requisitos = await x402.buildPaymentRequirements({ scheme: "exact", payTo: d.config.payTo, price: d.config.precio, network: RED_X402 });
    const recurso = { url: url.pathname, description: "Riesgo del préstamo Writz (salud, semáforo y precio de liquidación)", mimeType: "application/json" };
    const pedirPago = async (error?: string) => {
      const pr = await x402.createPaymentRequiredResponse(requisitos, recurso, error);
      json(res, 402, pr, { "PAYMENT-REQUIRED": encodePaymentRequiredHeader(pr) });
    };

    const firma = req.headers["payment-signature"];
    if (typeof firma !== "string" || !firma) return pedirPago("Falta el pago (PAYMENT-SIGNATURE)");
    let pago;
    try { pago = decodePaymentSignatureHeader(firma); } catch { return pedirPago("PAYMENT-SIGNATURE inválido"); }
    const elegido = x402.findMatchingRequirements(requisitos, pago);
    if (!elegido) return pedirPago("El pago no coincide con lo que se cobra");
    const verif = await x402.verifyPayment(pago, elegido);
    if (!verif.isValid) return pedirPago(verif.invalidReason ?? "Pago inválido");

    // Primero leemos el préstamo: si no existe no cobramos.
    const p = await d.leerPrestamo(txid);
    if (!p) return json(res, 404, { error: "No encontré el préstamo" });
    const cobro = await x402.settlePayment(pago, elegido);
    if (!cobro.success) return pedirPago(cobro.errorReason ?? "No se pudo cobrar");
    json(res, 200, calcularRiesgo(p), { "PAYMENT-RESPONSE": encodePaymentResponseHeader(cobro) });
  }

  return createServer((req, res) => {
    atender(req, res).catch((e) => { console.error("riesgo:", e?.message ?? e); if (!res.headersSent) json(res, 500, { error: "Error interno" }); });
  });
}

export const facilitadorHttp = (url: string): FacilitatorClient => new HTTPFacilitatorClient({ url });
