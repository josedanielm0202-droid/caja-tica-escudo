import { stroopsAUsdc } from "../../../writz/units";

function agrupar(raw: string): string {
  const neg = raw.startsWith("-");
  const limpio = neg ? raw.slice(1) : raw;
  const [ent = "0", dec = ""] = limpio.split(".");
  const entFmt = Number(ent).toLocaleString("es-CR");
  const cuerpo = dec ? `${entFmt},${dec}` : entFmt;
  return `${neg ? "−" : ""}${cuerpo}`;
}

/** USDC legible a partir de stroops (7 decimales), con el separador de Costa Rica. */
export function textoUsdc(stroops: bigint): string {
  return `${agrupar(stroopsAUsdc(stroops))} USDC`;
}

export function textoSats(sats: bigint): string {
  return `${sats.toLocaleString("es-CR")} sats`;
}

export function etiquetaEstado(estado: "Active" | "Closed" | "Liquidated"): string {
  if (estado === "Active") return "Activo (Active)";
  if (estado === "Closed") return "Cerrado (Closed)";
  return "Liquidado (Liquidated)";
}

export function textoBtc(sats: bigint): string {
  const entero = sats / 100_000_000n;
  const frac = (sats % 100_000_000n).toString().padStart(8, "0").replace(/0+$/, "");
  const entFmt = Number(entero).toLocaleString("es-CR");
  return frac ? `${entFmt},${frac} BTC` : `${entFmt} BTC`;
}

/** Salud en basis points: 13800 → "138 %". */
export function textoSalud(bp: number | null): string {
  if (bp === null) return "Sin deuda";
  const n = bp / 100;
  const decimales = Number.isInteger(n) ? 0 : 1;
  return `${n.toLocaleString("es-CR", { minimumFractionDigits: decimales, maximumFractionDigits: 1 })} %`;
}

export function textoLtv(bp: number): string {
  if (!Number.isFinite(bp)) return "—";
  const n = bp / 100;
  const decimales = Number.isInteger(n) ? 0 : 1;
  return `${n.toLocaleString("es-CR", { minimumFractionDigits: decimales, maximumFractionDigits: 1 })} %`;
}

/** Precio en USD a partir de stroops (7 decimales por unidad). */
export function textoUsd(stroops: bigint): string {
  if (stroops <= 0n) return "—";
  const n = Number(stroops) / 1e7;
  return n.toLocaleString("es-CR", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function textoColones(monto: number): string {
  return monto.toLocaleString("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 });
}
