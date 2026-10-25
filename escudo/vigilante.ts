// Vigilante de salud: revisa la salud cada N segundos y alerta solo cuando cambia el nivel.
import { semaforo, type Semaforo } from "../writz/units.js";
import type { Telegram } from "./telegram.js";
import { EMOJI, porcentaje } from "./mensajes.js";

export interface Transicion { nivel: Semaforo; cambio: boolean; alerta: string | null; }

const ORDEN: Record<Semaforo, number> = { verde: 0, amarillo: 1, rojo: 2 };

/**
 * Función pura: dado el nivel anterior (null = primera lectura) y la salud nueva,
 * dice el nivel nuevo y si hay que alertar. Umbrales: 150 % amarillo, 125 % rojo.
 */
export function transicion(anterior: Semaforo | null, saludBp: number | null): Transicion {
  const nivel = semaforo(saludBp);
  const pct = porcentaje(saludBp);
  if (anterior === null) {
    // Primera lectura: solo avisa si ya arranca mal.
    return { nivel, cambio: false, alerta: nivel === "verde" ? null : `${EMOJI[nivel]} Escudo activo: la salud está en ${pct} (${nivel}).` };
  }
  if (nivel === anterior) return { nivel, cambio: false, alerta: null };
  let alerta: string;
  if (nivel === "verde") alerta = `🟢 Recuperado: la salud volvió a ${pct}. Todo en verde.`;
  else if (ORDEN[nivel] > ORDEN[anterior]) {
    alerta = nivel === "rojo"
      ? `🔴 Alerta roja: la salud bajó a ${pct} (menos de 125 %). Se liquida en 120 %. Abonar ya.`
      : `🟡 Atención: la salud bajó a ${pct} (menos de 150 %).`;
  } else alerta = `🟡 Mejorando: la salud subió a ${pct} (amarillo, todavía menos de 150 %).`;
  return { nivel, cambio: true, alerta };
}

export interface DepsVigilante {
  telegram: Telegram;
  salud: (txid: string) => Promise<number | null>;
  txid: string;
  chatId: string;
  /** Se llama en cada lectura (lo usa el abono automático). */
  alLeer?: (nivel: Semaforo, saludBp: number | null) => Promise<void>;
}

/** Una revisión. Devuelve el nivel nuevo (o el anterior si falló la lectura). */
export async function revisar(anterior: Semaforo | null, d: DepsVigilante): Promise<Semaforo | null> {
  let h: number | null;
  try { h = await d.salud(d.txid); }
  catch (e: any) { console.error("No pude leer la salud:", e?.message ?? e); return anterior; }
  const t = transicion(anterior, h);
  if (t.alerta) {
    try { await d.telegram.enviar(d.chatId, t.alerta); }
    catch (e: any) { console.error("No pude mandar la alerta:", e?.message ?? e); }
  }
  if (d.alLeer) await d.alLeer(t.nivel, h);
  return t.nivel;
}

export const intervaloS = (env: Record<string, string | undefined> = process.env) => {
  const n = Number(env.ESCUDO_INTERVALO_S);
  return Number.isFinite(n) && n >= 5 ? n : 30;
};

export async function vigilar(d: DepsVigilante, intervalo = intervaloS(), seguir: () => boolean = () => true): Promise<void> {
  let nivel: Semaforo | null = null;
  while (seguir()) {
    nivel = await revisar(nivel, d);
    await new Promise((r) => setTimeout(r, intervalo * 1000));
  }
}
