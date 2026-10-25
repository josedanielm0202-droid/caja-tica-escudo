import { describe, expect, it } from "vitest";
import {
  compararConSaldo,
  crcAStroops,
  leerLineas,
  referenciaSimulada,
  tipoCambioEjemplo,
  totalesPlanilla,
  validarLinea,
  type LineaPlanilla,
} from "./planilla";

const TASA = 512.4;

describe("totales de la planilla", () => {
  it("suma USDC y colones con el tipo de cambio de ejemplo", () => {
    const totales = totalesPlanilla(
      [
        { moneda: "usdc", monto: "10" },
        { moneda: "crc", monto: "5124" },
      ],
      TASA,
    );
    expect(totales.stroops).toBe(200_000_000n);
    expect(totales.colones).toBeCloseTo(10_248, 5);
  });

  it("acepta coma decimal y una línea vacía da cero", () => {
    expect(crcAStroops("256,2", TASA)).toBe(5_000_000n);
    expect(totalesPlanilla([], TASA)).toEqual({ stroops: 0n, colones: 0 });
  });

  it("rechaza montos en cero y un tipo de cambio malo", () => {
    expect(() => crcAStroops("0", TASA)).toThrow();
    expect(() => totalesPlanilla([{ moneda: "usdc", monto: "1.12345678" }], TASA)).toThrow();
    expect(tipoCambioEjemplo({ VITE_TIPO_CAMBIO_EJEMPLO: "0" })).toBe(512.4);
    expect(tipoCambioEjemplo({ VITE_TIPO_CAMBIO_EJEMPLO: "500,5" })).toBe(500.5);
  });

  it("compara el total con el USDC de la cuenta", () => {
    expect(compararConSaldo(10n, null)).toBe("sin-saldo");
    expect(compararConSaldo(10n, 10n)).toBe("alcanza");
    expect(compararConSaldo(11n, 10n)).toBe("falta");
  });

  it("la referencia simulada no parece un hash de Stellar", () => {
    expect(referenciaSimulada(1_234_567)).toBe("SIM-234567");
    expect(referenciaSimulada(42)).toBe("SIM-000042");
  });
});

describe("líneas en localStorage", () => {
  it("valida nombre, monto y cuenta", () => {
    expect(validarLinea({ nombre: "  ", moneda: "usdc", monto: "1", destino: "" }, TASA)).toMatch(/nombre/);
    expect(validarLinea({ nombre: "Ana", moneda: "usdc", monto: "1.2", destino: "GNO" }, TASA)).toMatch(/cuenta/);
    expect(validarLinea({ nombre: "Ana", moneda: "crc", monto: "1000", destino: "" }, TASA)).toBeNull();
  });

  it("guarda y vuelve a leer, e ignora basura", () => {
    const caja = new Map<string, string>();
    const almacen = {
      getItem: (k: string) => caja.get(k) ?? null,
      setItem: (k: string, v: string) => {
        caja.set(k, v);
      },
    };
    const linea: LineaPlanilla = {
      id: "1",
      nombre: "María",
      moneda: "usdc",
      monto: "2.5",
      destino: "",
    };
    almacen.setItem("caja-tica-planilla", JSON.stringify([linea, { nombre: "roto" }]));
    expect(leerLineas(almacen)).toEqual([linea]);
    expect(leerLineas({ getItem: () => "{" })).toEqual([]);
  });
});
