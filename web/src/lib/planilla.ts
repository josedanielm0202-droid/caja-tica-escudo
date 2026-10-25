import { stroopsAUsdc, usdcAStroops } from "../../../writz/units";

export const TIPO_CAMBIO_POR_DEFECTO = 512.4;
export const TOPE_LINEAS = 8;

export type MonedaLinea = "usdc" | "crc";

export interface LineaPlanilla {
  id: string;
  nombre: string;
  moneda: MonedaLinea;
  /** Texto decimal, con punto. */
  monto: string;
  /** Cuenta G… opcional, para pagar USDC en testnet. */
  destino: string;
}

export interface TotalesPlanilla {
  stroops: bigint;
  colones: number;
}

const CLAVE = "caja-tica-planilla";

export function tipoCambioEjemplo(env: { VITE_TIPO_CAMBIO_EJEMPLO?: string } = import.meta.env): number {
  const n = Number((env.VITE_TIPO_CAMBIO_EJEMPLO ?? "").trim().replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return TIPO_CAMBIO_POR_DEFECTO;
  return n;
}

export function normalizarMonto(texto: string): string {
  const limpio = texto.trim();
  if (limpio.includes(",") && limpio.includes(".")) throw new Error("Usá solo punto o solo coma.");
  return limpio.replace(",", ".");
}

export function crcAStroops(texto: string, colonesPorUsdc: number): bigint {
  if (!(colonesPorUsdc > 0)) throw new Error("El tipo de cambio no sirve.");
  const crc = Number(normalizarMonto(texto));
  if (!Number.isFinite(crc) || crc <= 0) throw new Error("El monto tiene que ser mayor a cero.");
  const stroops = Math.round((crc * 1e7) / colonesPorUsdc);
  if (stroops <= 0) throw new Error("El monto es muy chico para este tipo de cambio.");
  return BigInt(stroops);
}

export function stroopsDeLinea(linea: Pick<LineaPlanilla, "moneda" | "monto">, colonesPorUsdc: number): bigint {
  if (linea.moneda === "usdc") return usdcAStroops(normalizarMonto(linea.monto));
  return crcAStroops(linea.monto, colonesPorUsdc);
}

export function totalesPlanilla(lineas: Pick<LineaPlanilla, "moneda" | "monto">[], colonesPorUsdc: number): TotalesPlanilla {
  let stroops = 0n;
  for (const linea of lineas) stroops += stroopsDeLinea(linea, colonesPorUsdc);
  const usdc = Number(stroops) / 1e7;
  return { stroops, colones: usdc * colonesPorUsdc };
}

export type ComparacionSaldo = "sin-saldo" | "alcanza" | "falta";

export function compararConSaldo(total: bigint, saldo: bigint | null): ComparacionSaldo {
  if (saldo === null) return "sin-saldo";
  return total <= saldo ? "alcanza" : "falta";
}

export function referenciaSimulada(ahora = Date.now()): string {
  const n = Math.abs(Math.trunc(ahora) % 1_000_000)
    .toString()
    .padStart(6, "0");
  return `SIM-${n}`;
}

export function validarLinea(
  input: { nombre: string; moneda: MonedaLinea; monto: string; destino: string },
  colonesPorUsdc: number,
): string | null {
  const nombre = input.nombre.trim();
  if (!nombre) return "Poné el nombre de quien cobra.";
  if (nombre.length > 60) return "El nombre está muy largo.";
  try {
    stroopsDeLinea({ moneda: input.moneda, monto: input.monto }, colonesPorUsdc);
  } catch (causa) {
    const texto = causa instanceof Error ? causa.message : "";
    if (texto.includes("7 decimales") || texto.includes("inválido")) {
      return "El USDC lleva hasta 7 decimales. Por ejemplo: 12.5";
    }
    return texto || "El monto no es válido.";
  }
  const destino = input.destino.trim();
  if (destino && !/^G[A-Z2-7]{55}$/.test(destino)) {
    return "La cuenta G… no es válida. Podés dejarla vacía.";
  }
  return null;
}

function esLinea(valor: unknown): valor is LineaPlanilla {
  if (!valor || typeof valor !== "object") return false;
  const linea = valor as Partial<LineaPlanilla>;
  return (
    typeof linea.id === "string" &&
    typeof linea.nombre === "string" &&
    (linea.moneda === "usdc" || linea.moneda === "crc") &&
    typeof linea.monto === "string" &&
    typeof linea.destino === "string"
  );
}

export function leerLineas(almacen: Pick<Storage, "getItem"> | null): LineaPlanilla[] {
  if (!almacen) return [];
  try {
    const crudo = almacen.getItem(CLAVE);
    if (!crudo) return [];
    const data = JSON.parse(crudo) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(esLinea).slice(0, TOPE_LINEAS);
  } catch {
    return [];
  }
}

export function guardarLineas(almacen: Pick<Storage, "setItem"> | null, lineas: LineaPlanilla[]): void {
  if (!almacen) return;
  try {
    almacen.setItem(CLAVE, JSON.stringify(lineas.slice(0, TOPE_LINEAS)));
  } catch {
    /* localStorage lleno o bloqueado: la lista sigue en memoria. */
  }
}

/** USDC de la planilla, a 2 decimales. El colón no cae justo en un stroop. */
export function usdcVisible(stroops: bigint): string {
  const n = Number(stroops) / 1e7;
  return n.toLocaleString("es-CR", { maximumFractionDigits: 2 });
}

export function colonesDeStroops(stroops: bigint, colonesPorUsdc: number): number {
  return (Number(stroops) / 1e7) * colonesPorUsdc;
}

export function textoMontoLinea(linea: Pick<LineaPlanilla, "moneda" | "monto">, colonesPorUsdc: number): string {
  const stroops = stroopsDeLinea(linea, colonesPorUsdc);
  if (linea.moneda === "crc") {
    return `${stroopsAUsdc(stroops)} USDC · ${linea.monto.trim()} colones`;
  }
  return `${stroopsAUsdc(stroops)} USDC`;
}
