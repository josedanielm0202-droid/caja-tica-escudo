export type TipoMovimiento = "deposito" | "prestamo" | "pago" | "liquidacion" | "otro";

export const ETIQUETA_TIPO: Record<TipoMovimiento, string> = {
  deposito: "Depósito",
  prestamo: "Préstamo",
  pago: "Pago",
  liquidacion: "Liquidación",
  otro: "Otro",
};
