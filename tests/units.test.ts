import { describe, it, expect } from "vitest";
import { usdcAStroops, stroopsAUsdc, semaforo, enRiesgoDeLiquidacion, maximoPrestable, ltvBp, precioLiquidacion, saludTrasCaida, abonoParaSalud, invertirHex, valorColateral } from "../writz/units.js";

describe("unidades USDC (7 decimales)", () => {
  it("convierte montos válidos a stroops", () => {
    expect(usdcAStroops("12.5")).toBe(125_000_000n);
    expect(usdcAStroops(1)).toBe(10_000_000n);
    expect(stroopsAUsdc(125_000_000n)).toBe("12.5");
  });
  it("rechaza montos inválidos (0, negativos, texto, >7 decimales)", () => {
    for (const m of ["0", "-1", "abc", "1.12345678", ""]) expect(() => usdcAStroops(m)).toThrow();
  });
});

describe("salud y semáforo del panel", () => {
  it("sano es verde", () => expect(semaforo(16_000)).toBe("verde"));
  it("entre 125 % y 150 % es amarillo", () => expect(semaforo(13_000)).toBe("amarillo"));
  it("debajo de 125 % es rojo y debajo de 120 % está en riesgo", () => {
    expect(semaforo(11_900)).toBe("rojo");
    expect(enRiesgoDeLiquidacion(11_900)).toBe(true);
    expect(enRiesgoDeLiquidacion(12_000)).toBe(false);
  });
  it("sin deuda (null) es verde y sin riesgo", () => { expect(semaforo(null)).toBe("verde"); expect(enRiesgoDeLiquidacion(null)).toBe(false); });
});

describe("límites del préstamo", () => {
  const colateral = valorColateral(100_000n, 70_000n * 10_000_000n); // 0.001 BTC a $70k = $70
  it("valor del colateral", () => expect(stroopsAUsdc(colateral)).toBe("70"));
  it("LTV máximo 66 %: no se puede pedir más", () => {
    expect(stroopsAUsdc(maximoPrestable(colateral, 0n))).toBe("46.662");
    expect(maximoPrestable(colateral, colateral)).toBe(0n);
    expect(ltvBp(colateral, usdcAStroops("50"))).toBeGreaterThan(6_666);
  });
  it("precio de liquidación", () => {
    // deuda $35 con 0.001 BTC => se liquida a $42,000
    expect(stroopsAUsdc(precioLiquidacion(100_000n, usdcAStroops("35")))).toBe("42000");
  });
});

describe("Escudo: simular caída y abono", () => {
  it("una caída de 30 % baja la salud proporcionalmente", () => expect(saludTrasCaida(15_000, 30)).toBe(10_500));
  it("abono necesario para volver a 150 %", () => {
    const abono = abonoParaSalud(12_000, usdcAStroops("100"), 15_000);
    expect(stroopsAUsdc(abono)).toBe("20");
    expect(abonoParaSalud(16_000, usdcAStroops("100"), 15_000)).toBe(0n);
  });
  it("valida el porcentaje de caída", () => expect(() => saludTrasCaida(15_000, 100)).toThrow());
});

it("invierte txid display <-> interno", () => expect(invertirHex("0a0b")).toBe("0b0a"));
