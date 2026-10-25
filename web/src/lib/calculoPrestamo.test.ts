import { MAX_LTV_BP, MIN_BORROW_RATIO_BP } from "../../../writz/config";
import { maximoPrestable, precioLiquidacion, usdcAStroops, valorColateral } from "../../../writz/units";
import { describe, expect, it } from "vitest";
import { colateralDesdeSalud, montoDentroDelTope, simularLtv, TOPE_LTV_BP } from "./calculoPrestamo";

const SATS = 100_000n;
const COLATERAL = valorColateral(SATS, 70_000n * 10_000_000n);

describe("slider de LTV", () => {
  it("el tope del control es MAX_LTV_BP (66,66 %)", () => {
    expect(TOPE_LTV_BP).toBe(6_666);
    expect(TOPE_LTV_BP).toBe(MAX_LTV_BP);
  });

  it("en el tope el monto es maximoPrestable y la liquidación usa la deuda nueva", () => {
    const simulacion = simularLtv({
      colateralStroops: COLATERAL,
      deudaActual: 0n,
      sats: SATS,
      ltvDeseadoBp: TOPE_LTV_BP,
    });
    expect(simulacion.montoStroops).toBe(maximoPrestable(COLATERAL, 0n));
    expect(simulacion.deudaResultante).toBe(simulacion.montoStroops);
    expect(simulacion.liquidacion).toBe(precioLiquidacion(SATS, simulacion.deudaResultante));
    expect(simulacion.saludBp).toBe(Number((COLATERAL * 10_000n) / simulacion.deudaResultante));
    expect(simulacion.saludBp).toBeGreaterThanOrEqual(MIN_BORROW_RATIO_BP);
    expect(simulacion.sobreLimite).toBe(false);
    expect(montoDentroDelTope(simulacion)).toBe(true);
  });

  it("resta la deuda que ya existe", () => {
    const deuda = usdcAStroops("10");
    const simulacion = simularLtv({
      colateralStroops: COLATERAL,
      deudaActual: deuda,
      sats: SATS,
      ltvDeseadoBp: TOPE_LTV_BP,
    });
    expect(simulacion.montoStroops).toBe(maximoPrestable(COLATERAL, deuda));
    expect(simulacion.deudaResultante).toBe(deuda + simulacion.montoStroops);
    expect(simulacion.liquidacion).toBe(precioLiquidacion(SATS, simulacion.deudaResultante));
  });

  it("un LTV por encima del tope no aumenta el monto", () => {
    const simulacion = simularLtv({
      colateralStroops: COLATERAL,
      deudaActual: 0n,
      sats: SATS,
      ltvDeseadoBp: 9_000,
    });
    expect(simulacion.ltvPedidoBp).toBe(TOPE_LTV_BP);
    expect(simulacion.montoStroops).toBe(maximoPrestable(COLATERAL, 0n));
    expect(simulacion.sobreLimite).toBe(true);
    expect(montoDentroDelTope(simulacion)).toBe(false);
  });

  it("LTV 0 no pide nada y no hay precio de liquidación", () => {
    const simulacion = simularLtv({
      colateralStroops: COLATERAL,
      deudaActual: 0n,
      sats: SATS,
      ltvDeseadoBp: 0,
    });
    expect(simulacion.montoStroops).toBe(0n);
    expect(simulacion.saludBp).toBeNull();
    expect(simulacion.liquidacion).toBe(0n);
    expect(montoDentroDelTope(simulacion)).toBe(false);
  });

  it("si ya estás en el tope, el monto nuevo es cero", () => {
    const deuda = maximoPrestable(COLATERAL, 0n);
    const simulacion = simularLtv({
      colateralStroops: COLATERAL,
      deudaActual: deuda,
      sats: SATS,
      ltvDeseadoBp: TOPE_LTV_BP,
    });
    expect(simulacion.montoStroops).toBe(0n);
    expect(simulacion.topeStroops).toBe(0n);
  });

  it("a 50 % de LTV la salud queda cerca de 200 %", () => {
    const simulacion = simularLtv({
      colateralStroops: COLATERAL,
      deudaActual: 0n,
      sats: SATS,
      ltvDeseadoBp: 5_000,
    });
    expect(simulacion.saludBp).toBeGreaterThanOrEqual(19_900);
    expect(simulacion.saludBp).toBeLessThanOrEqual(20_100);
    expect(montoDentroDelTope(simulacion)).toBe(true);
  });
});

describe("colateral desde la salud", () => {
  it("recupera el valor en USDC cuando hay deuda", () => {
    const deuda = usdcAStroops("2");
    const salud = 40_209;
    expect(colateralDesdeSalud(deuda, salud)).toBe((deuda * BigInt(salud)) / 10_000n);
  });

  it("sin deuda no inventa un precio", () => {
    expect(colateralDesdeSalud(0n, null)).toBeNull();
    expect(colateralDesdeSalud(usdcAStroops("1"), null)).toBeNull();
    expect(colateralDesdeSalud(0n, 15_000)).toBeNull();
  });
});
