// Bot del Escudo: atiende comandos con long polling (getUpdates).
import type { Prestamo } from "../writz/client.js";
import type { Telegram } from "./telegram.js";
import { AYUDA, textoEstado } from "./mensajes.js";
import { leerPorcentaje, textoSimulacion } from "./abono.js";

export interface DepsBot {
  telegram: Telegram;
  leerPrestamo: (txid: string) => Promise<Prestamo | null>;
  txid: string;
  chatId?: string; // si viene, solo responde a ese chat
  abonoAuto?: boolean; // para explicar qué haría el Escudo en /simular
}

/** Respuesta a un comando, o null si no aplica. */
export async function responder(texto: string, d: DepsBot): Promise<string | null> {
  const cmd = texto.trim().split(/\s+/)[0].split("@")[0].toLowerCase();
  if (cmd === "/start" || cmd === "/estado") {
    try {
      const p = await d.leerPrestamo(d.txid);
      return (cmd === "/start" ? "¡Hola! Soy el Escudo de Caja Tica.\n\n" : "") + textoEstado(p) + (cmd === "/start" ? `\n\n${AYUDA}` : "");
    } catch (e: any) {
      return `No pude leer el préstamo: ${e?.message ?? e}`;
    }
  }
  if (cmd === "/simular") {
    const pct = leerPorcentaje(texto);
    if (pct === null) return "Uso: /simular <porcentaje de caída del BTC>, ej. /simular 25";
    try { return textoSimulacion(await d.leerPrestamo(d.txid), pct, !!d.abonoAuto); }
    catch (e: any) { return `No pude leer el préstamo: ${e?.message ?? e}`; }
  }
  if (cmd === "/ayuda" || cmd === "/help") return AYUDA;
  return null;
}

/** Procesa un lote de actualizaciones y devuelve el siguiente offset. */
export async function atenderLote(offset: number, d: DepsBot, esperaS = 25): Promise<number> {
  const ups = await d.telegram.obtenerActualizaciones(offset, esperaS);
  for (const u of ups) {
    offset = Math.max(offset, u.updateId + 1);
    if (!u.mensaje) continue;
    if (d.chatId && u.mensaje.chatId !== d.chatId) continue;
    const r = await responder(u.mensaje.texto, d);
    if (r) await d.telegram.enviar(u.mensaje.chatId, r);
  }
  return offset;
}

export async function escuchar(d: DepsBot, seguir: () => boolean = () => true): Promise<void> {
  let offset = 0;
  while (seguir()) {
    try { offset = await atenderLote(offset, d); }
    catch (e: any) { console.error("Error en polling:", e?.message ?? e); await new Promise((r) => setTimeout(r, 5000)); }
  }
}
