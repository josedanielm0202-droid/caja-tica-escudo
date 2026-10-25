// Textos que manda el Escudo. Funciones puras.
import type { Prestamo } from "../writz/client.js";
import type { Semaforo } from "../writz/units.js";

export const EMOJI: Record<Semaforo, string> = { verde: "🟢", amarillo: "🟡", rojo: "🔴" };

/** 15000 -> "150.00 %" */
export const porcentaje = (bp: number | null) => (bp === null ? "sin deuda" : `${(bp / 100).toFixed(2)} %`);

export function textoEstado(p: Prestamo | null): string {
  if (!p) return "No encontré el préstamo. Revisá LOAN_TXID.";
  return [
    `${EMOJI[p.semaforo]} Escudo — estado del préstamo`,
    `Salud: ${porcentaje(p.saludBp)} (${p.semaforo})`,
    `Deuda: ${p.deudaUsdc} USDC`,
    `Estado: ${p.estado}`,
    p.enRiesgo ? "⚠️ Riesgo de liquidación (menos de 120 %)" : "",
  ].filter(Boolean).join("\n");
}

export const AYUDA = "Comandos:\n/estado — salud y deuda del préstamo\n/simular <porcentaje> — qué pasaría si el BTC cae ese %";
