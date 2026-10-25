import { BP, MAX_LTV_BP, MIN_BORROW_RATIO_BP } from "../../../writz/config";
import { ltvBp, maximoPrestable, precioLiquidacion } from "../../../writz/units";

/** Tope del control: 66,66 % (`MAX_LTV_BP` = 6666). */
export const TOPE_LTV_BP = MAX_LTV_BP;

export interface SimulacionLtv {
  /** LTV pedido, ya recortado al tope. */
  ltvPedidoBp: number;
  /** USDC nuevo, en stroops. Nunca pasa de `maximoPrestable`. */
  montoStroops: bigint;
  deudaResultante: bigint;
  /** null si la deuda resultante es 0. */
  saludBp: number | null;
  /** Stroops de USDC por 1 BTC. 0 si no hay deuda. */
  liquidacion: bigint;
  /** LTV de la deuda resultante. */
  ltvResultanteBp: number;
  topeStroops: bigint;
  /** Pidieron más LTV del tope, o la salud quedaría bajo 150 %. */
  sobreLimite: boolean;
}

/**
 * Cuánto pedir para llegar a un LTV, sin pasar de `maximoPrestable`.
 * `ltvDeseadoBp` es el LTV de la deuda total, no solo del monto nuevo.
 */
export function simularLtv(opciones: {
  colateralStroops: bigint;
  deudaActual: bigint;
  sats: bigint;
  ltvDeseadoBp: number;
}): SimulacionLtv {
  const pedido = Number.isFinite(opciones.ltvDeseadoBp) ? Math.round(opciones.ltvDeseadoBp) : 0;
  const sobrePedido = pedido > TOPE_LTV_BP;
  const ltvPedidoBp = Math.min(TOPE_LTV_BP, Math.max(0, pedido));
  const topeStroops = maximoPrestable(opciones.colateralStroops, opciones.deudaActual);
  const deudaObjetivo = (opciones.colateralStroops * BigInt(ltvPedidoBp)) / BigInt(BP);
  let montoStroops = deudaObjetivo > opciones.deudaActual ? deudaObjetivo - opciones.deudaActual : 0n;
  if (montoStroops > topeStroops) montoStroops = topeStroops;
  const deudaResultante = opciones.deudaActual + montoStroops;
  const saludBp =
    deudaResultante <= 0n || opciones.colateralStroops <= 0n
      ? null
      : Number((opciones.colateralStroops * BigInt(BP)) / deudaResultante);
  const bajoSalud = montoStroops > 0n && saludBp !== null && saludBp < MIN_BORROW_RATIO_BP;
  return {
    ltvPedidoBp,
    montoStroops,
    deudaResultante,
    saludBp,
    liquidacion: precioLiquidacion(opciones.sats, deudaResultante),
    ltvResultanteBp: ltvBp(opciones.colateralStroops, deudaResultante),
    topeStroops,
    sobreLimite: sobrePedido || bajoSalud || montoStroops > topeStroops,
  };
}

/** true si hay un monto nuevo y cabe en el tope de 66 %. */
export function montoDentroDelTope(simulacion: SimulacionLtv): boolean {
  return simulacion.montoStroops > 0n && !simulacion.sobreLimite && simulacion.montoStroops <= simulacion.topeStroops;
}

/**
 * Valor del colateral en stroops de USDC, a partir de la salud del contrato.
 * Sin deuda la salud viene en null y no hay precio del oráculo en la posición.
 */
export function colateralDesdeSalud(deudaStroops: bigint, saludBp: number | null): bigint | null {
  if (deudaStroops <= 0n || saludBp === null || !Number.isFinite(saludBp) || saludBp <= 0) return null;
  return (deudaStroops * BigInt(Math.round(saludBp))) / BigInt(BP);
}
