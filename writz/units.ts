// Funciones puras (sin red): conversiones y reglas de negocio compartidas.
import { BP, LIQUIDATION_BP, MAX_LTV_BP, MIN_BORROW_RATIO_BP, USDC_DECIMALS } from "./config.js";

const SCALE = 10n ** BigInt(USDC_DECIMALS);

/** "12.5" o 12.5 -> 125000000n (stroops, 7 decimales). Rechaza montos inválidos. */
export function usdcAStroops(monto: string | number): bigint {
  const s = typeof monto === "number" ? monto.toString() : monto.trim();
  if (!/^\d+(\.\d{1,7})?$/.test(s)) throw new Error(`Monto USDC inválido: ${monto}`);
  const [ent, dec = ""] = s.split(".");
  const v = BigInt(ent) * SCALE + BigInt(dec.padEnd(USDC_DECIMALS, "0"));
  if (v <= 0n) throw new Error("El monto debe ser mayor a 0");
  return v;
}

/** 125000000n -> "12.5" */
export function stroopsAUsdc(v: bigint): string {
  const neg = v < 0n; const a = neg ? -v : v;
  const ent = a / SCALE; const dec = (a % SCALE).toString().padStart(USDC_DECIMALS, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${ent}${dec ? "." + dec : ""}`;
}

export type Semaforo = "verde" | "amarillo" | "rojo";

/** Color del medidor del panel (boceto): verde >= 150 %, amarillo 125–150 %, rojo < 125 %. */
export function semaforo(healthBp: number | null): Semaforo {
  if (healthBp === null) return "verde"; // sin deuda
  if (healthBp >= MIN_BORROW_RATIO_BP) return "verde";
  if (healthBp >= 12_500) return "amarillo";
  return "rojo";
}

export const enRiesgoDeLiquidacion = (healthBp: number | null) => healthBp !== null && healthBp < LIQUIDATION_BP;

/** Valor del BTC en USDC-stroops. precioUsd con 7 decimales (stroops por 1 BTC). */
export function valorColateral(sats: bigint, precioBtcStroops: bigint): bigint {
  return (sats * precioBtcStroops) / 100_000_000n;
}

/** Máximo que se puede pedir hoy (LTV 66 %) menos la deuda actual. */
export function maximoPrestable(colateralStroops: bigint, deudaStroops: bigint): bigint {
  const max = (colateralStroops * BigInt(MAX_LTV_BP)) / BigInt(BP);
  return max > deudaStroops ? max - deudaStroops : 0n;
}

/** LTV en bp de una deuda contra un colateral. */
export function ltvBp(colateralStroops: bigint, deudaStroops: bigint): number {
  if (colateralStroops === 0n) return deudaStroops > 0n ? Infinity : 0;
  return Number((deudaStroops * BigInt(BP)) / colateralStroops);
}

/** Precio del BTC al que se liquidaría (stroops por BTC). */
export function precioLiquidacion(sats: bigint, deudaStroops: bigint): bigint {
  if (sats === 0n) return 0n;
  return (deudaStroops * BigInt(LIQUIDATION_BP) * 100_000_000n) / (BigInt(BP) * sats);
}

/** Salud simulada si el BTC cae `caidaPct` % (para "Simular caída" del Escudo). */
export function saludTrasCaida(healthBp: number, caidaPct: number): number {
  if (caidaPct < 0 || caidaPct >= 100) throw new Error("caidaPct debe estar entre 0 y 99");
  return Math.floor((healthBp * (100 - caidaPct)) / 100);
}

/** Cuánto abonar para volver a una salud objetivo (aprox., colateral fijo). */
export function abonoParaSalud(healthBp: number, deudaStroops: bigint, objetivoBp: number): bigint {
  if (healthBp >= objetivoBp) return 0n;
  const colateral = (deudaStroops * BigInt(healthBp)) / BigInt(BP);
  const deudaObjetivo = (colateral * BigInt(BP)) / BigInt(objetivoBp);
  return deudaStroops - deudaObjetivo;
}

/** txid en orden "display" (exploradores) <-> orden interno (contrato). */
export const invertirHex = (hex: string) => Buffer.from(hex, "hex").reverse().toString("hex");
