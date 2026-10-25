// Pruebas del bot del Escudo (Telegram simulado, sin red).
import { describe, it, expect, vi } from "vitest";
import { crearTelegram, type FetchFn } from "../escudo/telegram.js";
import { responder, atenderLote, type DepsBot } from "../escudo/bot.js";
import { textoEstado, porcentaje } from "../escudo/mensajes.js";
import { leerConfig } from "../escudo/config.js";
import type { Prestamo } from "../writz/client.js";
// Solo para que `tsc` revise los scripts de entrada (no se ejecutan aquí).
import type {} from "../escudo/index.js";
import type {} from "../escudo/prueba.js";

export const prestamo = (o: Partial<Prestamo> = {}): Prestamo => ({
  txid: "ab".repeat(32), dueno: "GDEMO", btcSats: "100000", deudaStroops: "100000000", deudaUsdc: "10",
  estado: "Active", timelockHeight: 1, saludBp: 16000, semaforo: "verde", enRiesgo: false, ...o,
});

function fetchFalso(respuestas: any[]) {
  const llamadas: { url: string; body: any }[] = [];
  const f: FetchFn = async (url, init) => {
    llamadas.push({ url, body: JSON.parse(init?.body ?? "{}") });
    const r = respuestas.shift() ?? { ok: true, result: true };
    return { ok: r.ok, status: r.ok ? 200 : 400, json: async () => r };
  };
  return { f, llamadas };
}

describe("cliente de Telegram", () => {
  it("envía sendMessage con chat_id y texto", async () => {
    const { f, llamadas } = fetchFalso([]);
    await crearTelegram("TOKEN", f).enviar("42", "hola");
    expect(llamadas[0].url).toBe("https://api.telegram.org/botTOKEN/sendMessage");
    expect(llamadas[0].body).toMatchObject({ chat_id: "42", text: "hola" });
  });
  it("convierte getUpdates en actualizaciones", async () => {
    const { f, llamadas } = fetchFalso([{ ok: true, result: [{ update_id: 7, message: { chat: { id: 42 }, text: "/estado" } }, { update_id: 8 }] }]);
    const ups = await crearTelegram("T", f).obtenerActualizaciones(5, 0);
    expect(llamadas[0].body).toMatchObject({ offset: 5, timeout: 0 });
    expect(ups).toEqual([{ updateId: 7, mensaje: { chatId: "42", texto: "/estado" } }, { updateId: 8, mensaje: undefined }]);
  });
  it("un error no expone el token", async () => {
    const { f } = fetchFalso([{ ok: false, description: "Unauthorized" }]);
    await expect(crearTelegram("SECRETO", f).enviar("1", "x")).rejects.toThrow(/Unauthorized/);
    await expect(crearTelegram("SECRETO", fetchFalso([{ ok: false }]).f).enviar("1", "x")).rejects.not.toThrow(/SECRETO/);
  });
  it("exige token", () => { expect(() => crearTelegram("")).toThrow(/TELEGRAM_BOT_TOKEN/); });
});

describe("mensajes", () => {
  it("formatea porcentaje", () => { expect(porcentaje(15000)).toBe("150.00 %"); expect(porcentaje(null)).toBe("sin deuda"); });
  it("estado con semáforo, deuda y estado", () => {
    const t = textoEstado(prestamo({ saludBp: 13000, semaforo: "amarillo" }));
    expect(t).toContain("🟡"); expect(t).toContain("130.00 %"); expect(t).toContain("10 USDC"); expect(t).toContain("Active");
  });
  it("avisa riesgo de liquidación", () => { expect(textoEstado(prestamo({ saludBp: 11000, semaforo: "rojo", enRiesgo: true }))).toMatch(/🔴[\s\S]*liquidación/); });
  it("préstamo inexistente", () => { expect(textoEstado(null)).toMatch(/LOAN_TXID/); });
});

describe("bot", () => {
  const deps = (o: Partial<DepsBot> = {}): DepsBot => ({
    telegram: { enviar: vi.fn(async () => {}), obtenerActualizaciones: vi.fn(async () => []) },
    leerPrestamo: vi.fn(async () => prestamo()), txid: "ab".repeat(32), ...o,
  });
  it("/estado y /start responden con la salud", async () => {
    expect(await responder("/estado", deps())).toContain("160.00 %");
    expect(await responder("/start@MiBot", deps())).toMatch(/Hola[\s\S]*160.00 %/);
  });
  it("ignora texto que no es comando", async () => { expect(await responder("hola", deps())).toBeNull(); });
  it("reporta error de lectura sin caerse", async () => {
    expect(await responder("/estado", deps({ leerPrestamo: async () => { throw new Error("rpc caído"); } }))).toContain("rpc caído");
  });
  it("atiende un lote, filtra por chat y avanza el offset", async () => {
    const d = deps({ chatId: "42" });
    (d.telegram.obtenerActualizaciones as any).mockResolvedValueOnce([
      { updateId: 10, mensaje: { chatId: "42", texto: "/estado" } },
      { updateId: 11, mensaje: { chatId: "99", texto: "/estado" } },
    ]);
    expect(await atenderLote(0, d, 0)).toBe(12);
    expect(d.telegram.enviar).toHaveBeenCalledTimes(1);
    expect((d.telegram.enviar as any).mock.calls[0][0]).toBe("42");
  });
});

describe("config", () => {
  it("lista las variables que faltan", () => { expect(() => leerConfig({ LOAN_TXID: "x" })).toThrow(/TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID/); });
  it("lee las variables", () => { expect(leerConfig({ TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "1", LOAN_TXID: "x" })).toEqual({ token: "t", chatId: "1", txid: "x" }); });
});
