// Pruebas del vigilante de salud (sin red).
import { describe, it, expect, vi } from "vitest";
import { transicion, revisar, intervaloS, type DepsVigilante } from "../escudo/vigilante.js";

describe("transicion (función pura)", () => {
  it("primera lectura verde: sin alerta", () => { expect(transicion(null, 16000)).toEqual({ nivel: "verde", cambio: false, alerta: null }); });
  it("primera lectura roja: avisa", () => { const t = transicion(null, 12000); expect(t.nivel).toBe("rojo"); expect(t.alerta).toContain("🔴"); });
  it("sin deuda cuenta como verde", () => { expect(transicion(null, null).nivel).toBe("verde"); });
  it("mismo nivel: no repite alerta", () => {
    expect(transicion("verde", 15500).alerta).toBeNull();
    expect(transicion("amarillo", 14000).alerta).toBeNull();
    expect(transicion("rojo", 11000).alerta).toBeNull();
  });
  it("cruza 150 %: amarillo", () => { const t = transicion("verde", 14999); expect(t).toMatchObject({ nivel: "amarillo", cambio: true }); expect(t.alerta).toMatch(/🟡.*149.99 %/); });
  it("exactamente 150 % sigue verde", () => { expect(transicion("verde", 15000).cambio).toBe(false); });
  it("cruza 125 %: rojo", () => { expect(transicion("amarillo", 12499).alerta).toMatch(/🔴 Alerta roja/); });
  it("exactamente 125 % es amarillo", () => { expect(transicion("amarillo", 12500).nivel).toBe("amarillo"); });
  it("salta de verde a rojo directo", () => { expect(transicion("verde", 11000).alerta).toMatch(/🔴/); });
  it("de rojo a amarillo: mejorando", () => { expect(transicion("rojo", 13000).alerta).toMatch(/Mejorando/); });
  it("vuelve a verde: recuperado", () => {
    expect(transicion("rojo", 15100).alerta).toMatch(/🟢 Recuperado/);
    expect(transicion("amarillo", 15000).alerta).toMatch(/Recuperado/);
  });
});

describe("revisar", () => {
  const deps = (lecturas: (number | null | Error)[]): DepsVigilante => ({
    telegram: { enviar: vi.fn(async () => {}), obtenerActualizaciones: vi.fn(async () => []) },
    salud: vi.fn(async () => { const v = lecturas.shift(); if (v instanceof Error) throw v; return v ?? null; }),
    txid: "ab".repeat(32), chatId: "42",
  });
  it("alerta solo en los cambios de nivel durante varios ticks", async () => {
    const d = deps([16000, 15800, 14000, 13900, 12000, 11800, 15500]);
    let n = null as any;
    for (let i = 0; i < 7; i++) n = await revisar(n, d);
    const textos = (d.telegram.enviar as any).mock.calls.map((c: any[]) => c[1]);
    expect(textos).toHaveLength(3);
    expect(textos[0]).toMatch(/🟡/); expect(textos[1]).toMatch(/🔴/); expect(textos[2]).toMatch(/🟢/);
    expect(n).toBe("verde");
  });
  it("si falla la lectura mantiene el nivel y no alerta", async () => {
    const d = deps([new Error("rpc")]);
    expect(await revisar("amarillo", d)).toBe("amarillo");
    expect(d.telegram.enviar).not.toHaveBeenCalled();
  });
  it("si falla Telegram no se cae y llama alLeer", async () => {
    const d = deps([12000]);
    (d.telegram.enviar as any).mockRejectedValueOnce(new Error("409"));
    d.alLeer = vi.fn(async () => {});
    expect(await revisar("verde", d)).toBe("rojo");
    expect(d.alLeer).toHaveBeenCalledWith("rojo", 12000);
  });
});

describe("intervaloS", () => {
  it("30 por defecto", () => { expect(intervaloS({})).toBe(30); expect(intervaloS({ ESCUDO_INTERVALO_S: "abc" })).toBe(30); });
  it("usa el valor del env (mínimo 5)", () => { expect(intervaloS({ ESCUDO_INTERVALO_S: "10" })).toBe(10); expect(intervaloS({ ESCUDO_INTERVALO_S: "1" })).toBe(30); });
});
