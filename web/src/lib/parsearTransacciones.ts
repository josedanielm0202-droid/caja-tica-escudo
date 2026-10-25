import type { TipoMovimiento } from "./tiposMovimiento";

export interface MovimientoDoc {
  paso: string;
  enlace: string;
  resultado: string;
  tipo: TipoMovimiento;
  hash: string | null;
  fecha: string | null;
}

const FILA = /^\|\s*(.+?)\s*\|\s*\[.*?\]\((https?:\/\/[^)\s]+)\)\s*\|\s*(.*?)\s*\|$/;

export function tipoDesdeTexto(texto: string): TipoMovimiento {
  const t = texto.toLowerCase();
  if (/liquid/.test(t)) return "liquidacion";
  if (/borrow|préstamo|prestamo/.test(t)) return "prestamo";
  if (/repay|\bpago\b|transfer|abono/.test(t)) return "pago";
  if (/deposit|depósito|deposito|bóveda|boveda/.test(t)) return "deposito";
  return "otro";
}

function hashDeEnlace(enlace: string): string | null {
  const m = enlace.match(/\/(?:tx|transactions)\/([0-9a-fA-F]{64})\/?$/);
  return m ? m[1]!.toLowerCase() : null;
}

function fechaDelTitulo(markdown: string): string | null {
  const m = markdown.match(/(\d{1,2})-([a-z]{3})-(\d{4})/i);
  if (!m) return null;
  return `${m[1]} ${m[2]} ${m[3]}`;
}

/** Lee la tabla de docs/transacciones.md. Ignora el encabezado. */
export function parsearTransaccionesDemo(markdown: string): MovimientoDoc[] {
  const fecha = fechaDelTitulo(markdown);
  const filas: MovimientoDoc[] = [];
  for (const linea of markdown.split(/\r?\n/)) {
    const m = linea.match(FILA);
    if (!m) continue;
    const paso = m[1]!.replace(/`/g, "").trim();
    if (/^paso$/i.test(paso)) continue;
    const enlace = m[2]!.trim();
    filas.push({
      paso,
      enlace,
      resultado: m[3]!.replace(/`/g, "").trim(),
      tipo: tipoDesdeTexto(paso),
      hash: hashDeEnlace(enlace),
      fecha,
    });
  }
  return filas;
}

/** Primera cuenta G… de un enlace a Stellar Expert en el markdown. */
export function cuentaDemo(markdown: string): string | null {
  const m = markdown.match(/explorer\/testnet\/account\/(G[A-Z2-7]{55})/);
  return m?.[1] ?? null;
}
