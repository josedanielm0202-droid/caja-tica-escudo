// Cliente mínimo de la API de bots de Telegram usando fetch (sin dependencias extra).
export type FetchFn = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

export interface Mensaje { chatId: string; texto: string; }
export interface Actualizacion { updateId: number; mensaje?: Mensaje; }

export interface Telegram {
  enviar(chatId: string, texto: string): Promise<void>;
  obtenerActualizaciones(offset: number, esperaS?: number): Promise<Actualizacion[]>;
}

export function crearTelegram(token: string, fetchFn: FetchFn = fetch as unknown as FetchFn): Telegram {
  if (!token) throw new Error("Falta TELEGRAM_BOT_TOKEN");
  const base = `https://api.telegram.org/bot${token}`;
  async function llamar(metodo: string, cuerpo: unknown): Promise<any> {
    const r = await fetchFn(`${base}/${metodo}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) });
    const j = await r.json();
    // Nunca incluir la URL en el error: lleva el token.
    if (!r.ok || !j.ok) throw new Error(`Telegram ${metodo} falló (${r.status}): ${j.description ?? "sin detalle"}`);
    return j.result;
  }
  return {
    async enviar(chatId, texto) { await llamar("sendMessage", { chat_id: chatId, text: texto, disable_web_page_preview: true }); },
    async obtenerActualizaciones(offset, esperaS = 25) {
      const res: any[] = await llamar("getUpdates", { offset, timeout: esperaS, allowed_updates: ["message"] });
      return res.map((u) => ({
        updateId: u.update_id,
        mensaje: u.message?.text ? { chatId: String(u.message.chat.id), texto: u.message.text } : undefined,
      }));
    },
  };
}
