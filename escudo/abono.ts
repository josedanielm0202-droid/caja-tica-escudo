// Abono automático desde la reserva USDC y "Simular caída".
import type { Prestamo, ResultadoTx, Firmante } from "../writz/client.js";
import { abonoParaSalud, saludTrasCaida, semaforo, stroopsAUsdc, type Semaforo } from "../writz/units.js";
import { MIN_BORROW_RATIO_BP } from "../writz/config.js";
import type { Telegram } from "./telegram.js";
import { EMOJI, porcentaje } from "./mensajes.js";

import { leerUmbrales } from "./config.js";

export const UMBRALES = leerUmbrales();
/** Rojo configurable con ESCUDO_UMBRAL_ROJO_BP (por defecto 12500 = 125 %). */
export const UMBRAL_ROJO_BP = UMBRALES.rojoBp;
/** El abono lleva la salud al umbral amarillo (mínimo 150 %) para volver a verde. */
export const OBJETIVO_BP = Math.max(MIN_BORROW_RATIO_BP, UMBRALES.amarilloBp);

export type Decision =
  | { accion: "nada" }
  | { accion: "solo_alerta"; monto: bigint }
  | { accion: "enfriando"; restanteS: number }
  | { accion: "sin_reserva"; monto: bigint; saldo: bigint }
  | { accion: "abonar"; monto: bigint };

export interface Situacion {
  saludBp: number | null;
  deudaStroops: bigint;
  saldoReserva: bigint;
  auto: boolean;
  ultimoAbonoMs: number | null;
  ahoraMs: number;
  enfriamientoMs: number;
}

/** Monto en stroops para volver a OBJETIVO_BP (150 % por defecto). 0 si no hace falta. */
export const montoAbono = (saludBp: number | null, deudaStroops: bigint) =>
  saludBp === null || deudaStroops <= 0n ? 0n : abonoParaSalud(saludBp, deudaStroops, OBJETIVO_BP);

/** Función pura: qué hacer con la salud actual. */
export function decidirAbono(s: Situacion): Decision {
  if (s.saludBp === null || s.saludBp >= UMBRAL_ROJO_BP) return { accion: "nada" };
  const monto = montoAbono(s.saludBp, s.deudaStroops);
  if (monto <= 0n) return { accion: "nada" };
  if (!s.auto) return { accion: "solo_alerta", monto };
  if (s.ultimoAbonoMs !== null && s.ahoraMs - s.ultimoAbonoMs < s.enfriamientoMs)
    return { accion: "enfriando", restanteS: Math.ceil((s.enfriamientoMs - (s.ahoraMs - s.ultimoAbonoMs)) / 1000) };
  if (s.saldoReserva < monto) return { accion: "sin_reserva", monto, saldo: s.saldoReserva };
  return { accion: "abonar", monto };
}

export const abonoAutoActivo = (env: Record<string, string | undefined> = process.env) => env.ESCUDO_ABONO_AUTO === "on";
export const enfriamientoS = (env: Record<string, string | undefined> = process.env) => {
  const n = Number(env.ESCUDO_ENFRIAMIENTO_S);
  return Number.isFinite(n) && n > 0 ? n : 600;
};

export interface DepsAbono {
  telegram: Telegram;
  chatId: string;
  txid: string;
  auto: boolean;
  enfriamientoMs: number;
  reservaPublic?: string;
  reservaSecret?: string;
  leerPrestamo: (txid: string) => Promise<Prestamo | null>;
  saldoUsdc: (cuenta: string) => Promise<bigint>;
  pagar: (monto: string, txid: string, f: Firmante) => Promise<ResultadoTx>;
  ahora?: () => number;
}

/** Crea el manejador que el vigilante llama en cada lectura (`alLeer`). */
export function crearAbonador(d: DepsAbono) {
  let ultimoAbonoMs: number | null = null;
  let enCurso = false;
  let ultimoAviso = ""; // para no repetir el mismo aviso en cada tick
  const ahora = d.ahora ?? Date.now;
  const avisar = async (texto: string, clave: string) => {
    if (clave === ultimoAviso) return;
    ultimoAviso = clave;
    try { await d.telegram.enviar(d.chatId, texto); } catch (e: any) { console.error("Telegram:", e?.message ?? e); }
  };

  return async function alLeer(nivel: Semaforo, _saludBp: number | null): Promise<Decision> {
    if (nivel !== "rojo") { ultimoAviso = ""; return { accion: "nada" }; }
    if (enCurso) return { accion: "nada" };
    enCurso = true;
    try {
      const p = await d.leerPrestamo(d.txid);
      if (!p || p.estado !== "Active") return { accion: "nada" };
      const sinLlaves = d.auto && (!d.reservaPublic || !d.reservaSecret);
      const saldo = d.auto && !sinLlaves ? await d.saldoUsdc(d.reservaPublic!) : 0n;
      const dec = decidirAbono({
        saludBp: p.saludBp, deudaStroops: BigInt(p.deudaStroops), saldoReserva: saldo,
        auto: d.auto && !sinLlaves, ultimoAbonoMs, ahoraMs: ahora(), enfriamientoMs: d.enfriamientoMs,
      });
      if (dec.accion === "solo_alerta")
        await avisar(`🛡️ Para volver a ${porcentaje(OBJETIVO_BP)} hay que abonar ${stroopsAUsdc(dec.monto)} USDC.${sinLlaves ? " (Faltan RESERVA_PUBLIC/RESERVA_SECRET.)" : " Abono automático apagado (ESCUDO_ABONO_AUTO=on para activarlo)."}`, "alerta");
      else if (dec.accion === "sin_reserva")
        await avisar(`⚠️ La reserva no alcanza: necesita ${stroopsAUsdc(dec.monto)} USDC y tiene ${stroopsAUsdc(dec.saldo)} USDC. Abonar a mano.`, "sin_reserva");
      else if (dec.accion === "abonar") {
        ultimoAbonoMs = ahora(); // antes de pagar: evita doble abono aunque falle a medias
        try {
          const r = await d.pagar(stroopsAUsdc(dec.monto), d.txid, { secret: d.reservaSecret! });
          ultimoAviso = "";
          await avisar(`🛡️ Escudo abonó ${stroopsAUsdc(dec.monto)} USDC desde la reserva para volver a ${porcentaje(OBJETIVO_BP)}.\n${r.enlace}`, `abono:${r.hash}`);
        } catch (e: any) {
          await avisar(`❌ El abono automático falló: ${e?.message ?? e}`, "fallo");
        }
      }
      return dec;
    } catch (e: any) {
      console.error("Abonador:", e?.message ?? e);
      return { accion: "nada" };
    } finally { enCurso = false; }
  };
}

/** Texto de "/simular <porcentaje>": solo simulación, no manda transacciones. */
export function textoSimulacion(p: Prestamo | null, caidaPct: number, auto: boolean): string {
  if (!p) return "No encontré el préstamo. Revisá LOAN_TXID.";
  if (p.saludBp === null) return "El préstamo no tiene deuda: una caída del BTC no lo pone en riesgo.";
  const h = saludTrasCaida(p.saludBp, caidaPct);
  const nivel = semaforo(h, UMBRALES);
  const lineas = [
    `🧪 Simulación: el BTC cae ${caidaPct} %`,
    `Salud: ${porcentaje(p.saludBp)} → ${porcentaje(h)} ${EMOJI[nivel]} (${nivel})`,
  ];
  if (h < 12_000) lineas.push("💥 Por debajo de 120 %: el préstamo se podría liquidar.");
  if (h < UMBRAL_ROJO_BP) {
    const m = montoAbono(h, BigInt(p.deudaStroops));
    lineas.push(auto
      ? `🛡️ El Escudo abonaría ${stroopsAUsdc(m)} USDC desde la reserva para volver a ${porcentaje(OBJETIVO_BP)}.`
      : `🛡️ El Escudo avisaría que hay que abonar ${stroopsAUsdc(m)} USDC (abono automático apagado).`);
  } else if (nivel === "amarillo") lineas.push("🛡️ El Escudo mandaría una alerta amarilla.");
  else lineas.push("🛡️ Todo bien, el Escudo no haría nada.");
  lineas.push("(Solo simulación, no se envió ninguna transacción.)");
  return lineas.join("\n");
}

/** Lee el porcentaje de "/simular 30" o "/simular 30%". null si es inválido. */
export function leerPorcentaje(texto: string): number | null {
  const m = texto.trim().split(/\s+/)[1]?.replace("%", "").replace(",", ".");
  if (!m) return null;
  const n = Number(m);
  return Number.isFinite(n) && n >= 0 && n < 100 ? n : null;
}
