import type { TipoMovimiento } from "./tiposMovimiento";

export interface MovimientoSesion {
  hash: string;
  enlace: string;
  tipo: TipoMovimiento;
  titulo: string;
  cuando: number;
}

const CLAVE = "caja-tica-sesion";
const TOPE = 20;

function esMovimiento(valor: unknown): valor is MovimientoSesion {
  if (!valor || typeof valor !== "object") return false;
  const item = valor as Partial<MovimientoSesion>;
  return typeof item.hash === "string" && typeof item.enlace === "string" && typeof item.titulo === "string" && typeof item.cuando === "number";
}

export function leerSesion(almacen: Pick<Storage, "getItem"> | null): MovimientoSesion[] {
  if (!almacen) return [];
  try {
    const data = JSON.parse(almacen.getItem(CLAVE) ?? "[]") as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(esMovimiento).slice(0, TOPE);
  } catch {
    return [];
  }
}

export function guardarMovimientoSesion(
  almacen: Pick<Storage, "getItem" | "setItem"> | null,
  movimiento: MovimientoSesion,
): MovimientoSesion[] {
  const previos = leerSesion(almacen).filter((item) => item.hash !== movimiento.hash);
  const siguiente = [movimiento, ...previos].slice(0, TOPE);
  if (!almacen) return siguiente;
  try {
    almacen.setItem(CLAVE, JSON.stringify(siguiente));
  } catch {
    /* Si el navegador bloquea localStorage, el recibo igual se ve en la pantalla. */
  }
  return siguiente;
}
