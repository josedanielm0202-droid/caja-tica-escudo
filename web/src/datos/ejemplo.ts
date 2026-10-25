import { BP, MAX_LTV_BP } from "../../../writz/config";
import {
  enRiesgoDeLiquidacion,
  ltvBp,
  maximoPrestable,
  precioLiquidacion,
  usdcAStroops,
  valorColateral,
} from "../../../writz/units";

/** 100 000 USD por BTC, en stroops de 7 decimales. No es el precio del mercado. */
export const PRECIO_BTC_EJEMPLO = 100_000n * 10_000_000n;

/** 0,02 BTC en la bóveda de ejemplo. */
export const SATS_EJEMPLO = 2_000_000n;

export const COLATERAL = valorColateral(SATS_EJEMPLO, PRECIO_BTC_EJEMPLO);

export const TOPE_LTV_BP = MAX_LTV_BP;

/** Tipo de cambio inventado para el demo. No es la tasa del mercado. */
export const COLONES_POR_USDC_EJEMPLO = 512.4;

export const USDC_PLANILLA_EJEMPLO = usdcAStroops("400");

export type IdEscenario = "verde" | "amarillo" | "rojo" | "sin-deuda";

export interface Escenario {
  id: IdEscenario;
  nombre: string;
  explicacion: string;
  deudaStroops: bigint;
  /** Basis points. null = sin deuda. 13800 = 138 %. */
  saludBp: number | null;
}

function deudaParaSalud(saludBp: number): bigint {
  return (COLATERAL * BigInt(BP)) / BigInt(saludBp);
}

export const ESCENARIOS: Escenario[] = [
  {
    id: "verde",
    nombre: "Sano",
    explicacion: "Salud de 180 %. Así se ve un préstamo dentro del límite recomendado.",
    deudaStroops: deudaParaSalud(18_000),
    saludBp: 18_000,
  },
  {
    id: "amarillo",
    nombre: "Atención",
    explicacion: "Salud de 138 %. Entre 125 % y 150 %: conviene abonar.",
    deudaStroops: deudaParaSalud(13_800),
    saludBp: 13_800,
  },
  {
    id: "rojo",
    nombre: "Cuidado",
    explicacion: "Salud de 118 %. Bajo 120 % se puede perder parte de la garantía.",
    deudaStroops: deudaParaSalud(11_800),
    saludBp: 11_800,
  },
  {
    id: "sin-deuda",
    nombre: "Sin deuda",
    explicacion: "No hay USDC prestado. El semáforo queda en verde.",
    deudaStroops: 0n,
    saludBp: null,
  },
];

export function cifras(escenario: Escenario) {
  const deuda = escenario.deudaStroops;
  const saludBp = deuda === 0n ? null : Number((COLATERAL * BigInt(BP)) / deuda);
  return {
    saludBp,
    ltv: ltvBp(COLATERAL, deuda),
    disponible: maximoPrestable(COLATERAL, deuda),
    liquidacion: precioLiquidacion(SATS_EJEMPLO, deuda),
    enRiesgo: enRiesgoDeLiquidacion(saludBp),
  };
}

export function deudaDesdeLtv(ltv: number): bigint {
  return (COLATERAL * BigInt(ltv)) / BigInt(BP);
}

export function saludDesdeDeuda(deuda: bigint): number | null {
  if (deuda <= 0n) return null;
  return Number((COLATERAL * BigInt(BP)) / deuda);
}
