// Pruebas de los umbrales configurables del Escudo (sin red).
import { describe, it, expect } from "vitest";
import { leerUmbrales } from "../escudo/config.js";
import { semaforo } from "../writz/units.js";

describe("leerUmbrales", () => {
  it("valores por defecto: rojo 125 %, amarillo 150 %", () => {
    expect(leerUmbrales({})).toEqual({ rojoBp: 12_500, amarilloBp: 15_000 });
  });
  it("override válido", () => {
    expect(leerUmbrales({ ESCUDO_UMBRAL_ROJO_BP: "20000" })).toEqual({ rojoBp: 20_000, amarilloBp: 22_500 });
    expect(leerUmbrales({ ESCUDO_UMBRAL_ROJO_BP: "13000", ESCUDO_UMBRAL_AMARILLO_BP: "16000" })).toEqual({ rojoBp: 13_000, amarilloBp: 16_000 });
  });
  it("valores inválidos usan el defecto", () => {
    for (const v of ["abc", "9999", "50001", "12500.5", "-1", ""])
      expect(leerUmbrales({ ESCUDO_UMBRAL_ROJO_BP: v }).rojoBp).toBe(12_500);
    expect(leerUmbrales({ ESCUDO_UMBRAL_AMARILLO_BP: "xx" }).amarilloBp).toBe(15_000);
  });
  it("amarillo siempre mayor que rojo", () => {
    expect(leerUmbrales({ ESCUDO_UMBRAL_ROJO_BP: "14000", ESCUDO_UMBRAL_AMARILLO_BP: "13000" })).toEqual({ rojoBp: 14_000, amarilloBp: 16_500 });
  });
});

describe("semaforo con umbrales", () => {
  it("por defecto no cambia", () => { expect(semaforo(14_000)).toBe("amarillo"); expect(semaforo(12_000)).toBe("rojo"); });
  it("con umbral de demo 160 % es rojo", () => {
    const u = leerUmbrales({ ESCUDO_UMBRAL_ROJO_BP: "45000" });
    expect(semaforo(40_233, u)).toBe("rojo");
    expect(semaforo(48_000, u)).toBe("verde");
  });
});
