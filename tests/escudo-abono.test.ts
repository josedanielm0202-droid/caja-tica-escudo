// Pruebas del abono automático y de "Simular caída" (sin red).
import { describe, it, expect, vi } from "vitest";
import { decidirAbono, montoAbono, crearAbonador, textoSimulacion, leerPorcentaje, abonoAutoActivo, enfriamientoS, type Situacion, type DepsAbono } from "../escudo/abono.js";
import { responder } from "../escudo/bot.js";
import { abonoParaSalud, usdcAStroops } from "../writz/units.js";
import type { Prestamo } from "../writz/client.js";

const prestamo = (o: Partial<Prestamo> = {}): Prestamo => ({
  txid: "ab".repeat(32), dueno: "GDEMO", btcSats: "100000", deudaStroops: "1000000000", deudaUsdc: "100",
  estado: "Active", timelockHeight: 1, saludBp: 12000, semaforo: "rojo", enRiesgo: false, ...o,
});
const sit = (o: Partial<Situacion> = {}): Situacion => ({
  saludBp: 12000, deudaStroops: usdcAStroops(100), saldoReserva: usdcAStroops(1000), auto: true,
  ultimoAbonoMs: null, ahoraMs: 1_000_000, enfriamientoMs: 600_000, ...o,
});

describe("montoAbono", () => {
  it("usa abonoParaSalud hacia 150 %", () => {
    // 100 USDC a 120 % => colateral 120 => deuda objetivo 80 => abonar 20
    expect(montoAbono(12000, usdcAStroops(100))).toBe(usdcAStroops(20));
    expect(montoAbono(12000, 123456789n)).toBe(abonoParaSalud(12000, 123456789n, 15000));
  });
  it("0 si está sano o sin deuda", () => { expect(montoAbono(15000, 10n)).toBe(0n); expect(montoAbono(null, 10n)).toBe(0n); expect(montoAbono(11000, 0n)).toBe(0n); });
});

describe("decidirAbono", () => {
  it("nada si no está en rojo", () => { expect(decidirAbono(sit({ saludBp: 12500 }))).toEqual({ accion: "nada" }); expect(decidirAbono(sit({ saludBp: null })).accion).toBe("nada"); });
  it("abona en rojo con reserva suficiente", () => { expect(decidirAbono(sit())).toEqual({ accion: "abonar", monto: usdcAStroops(20) }); });
  it("solo alerta si el automático está apagado", () => { expect(decidirAbono(sit({ auto: false }))).toEqual({ accion: "solo_alerta", monto: usdcAStroops(20) }); });
  it("reserva insuficiente", () => { expect(decidirAbono(sit({ saldoReserva: usdcAStroops(5) }))).toEqual({ accion: "sin_reserva", monto: usdcAStroops(20), saldo: usdcAStroops(5) }); });
  it("enfriamiento evita doble abono", () => {
    expect(decidirAbono(sit({ ultimoAbonoMs: 900_000 }))).toEqual({ accion: "enfriando", restanteS: 500 });
    expect(decidirAbono(sit({ ultimoAbonoMs: 400_000 })).accion).toBe("abonar");
  });
});

describe("variables", () => {
  it("ESCUDO_ABONO_AUTO solo con 'on' exacto", () => {
    expect(abonoAutoActivo({ ESCUDO_ABONO_AUTO: "on" })).toBe(true);
    for (const v of ["ON", "true", "1", "", undefined]) expect(abonoAutoActivo({ ESCUDO_ABONO_AUTO: v })).toBe(false);
  });
  it("enfriamiento por defecto 600 s", () => { expect(enfriamientoS({})).toBe(600); expect(enfriamientoS({ ESCUDO_ENFRIAMIENTO_S: "60" })).toBe(60); });
});

describe("crearAbonador", () => {
  const deps = (o: Partial<DepsAbono> = {}) => {
    let t = 1_000_000;
    const d: DepsAbono = {
      telegram: { enviar: vi.fn(async () => {}), obtenerActualizaciones: vi.fn(async () => []) },
      chatId: "42", txid: "ab".repeat(32), auto: true, enfriamientoMs: 600_000,
      reservaPublic: "GRESERVA", reservaSecret: "S_FALSA",
      leerPrestamo: vi.fn(async () => prestamo()), saldoUsdc: vi.fn(async () => usdcAStroops(1000)),
      pagar: vi.fn(async () => ({ hash: "h1", enlace: "https://stellar.expert/explorer/testnet/tx/h1" })),
      ahora: () => t, ...o,
    };
    return { d, avanzar: (ms: number) => { t += ms; } };
  };
  it("abona una vez, con la reserva, y manda el enlace", async () => {
    const { d } = deps();
    const alLeer = crearAbonador(d);
    expect((await alLeer("rojo", 12000)).accion).toBe("abonar");
    expect(d.saldoUsdc).toHaveBeenCalledWith("GRESERVA");
    expect(d.pagar).toHaveBeenCalledWith("20", "ab".repeat(32), { secret: "S_FALSA" });
    expect((d.telegram.enviar as any).mock.calls[0][1]).toContain("https://stellar.expert/explorer/testnet/tx/h1");
  });
  it("no vuelve a abonar durante el enfriamiento", async () => {
    const { d, avanzar } = deps();
    const alLeer = crearAbonador(d);
    await alLeer("rojo", 12000);
    avanzar(30_000);
    expect((await alLeer("rojo", 12000)).accion).toBe("enfriando");
    avanzar(600_000);
    expect((await alLeer("rojo", 12000)).accion).toBe("abonar");
    expect(d.pagar).toHaveBeenCalledTimes(2);
  });
  it("no paga si la reserva no alcanza y avisa una sola vez", async () => {
    const { d } = deps({ saldoUsdc: vi.fn(async () => usdcAStroops(1)) });
    const alLeer = crearAbonador(d);
    await alLeer("rojo", 12000); await alLeer("rojo", 12000);
    expect(d.pagar).not.toHaveBeenCalled();
    expect(d.telegram.enviar).toHaveBeenCalledTimes(1);
    expect((d.telegram.enviar as any).mock.calls[0][1]).toMatch(/no alcanza/);
  });
  it("con el automático apagado solo alerta", async () => {
    const { d } = deps({ auto: false });
    expect((await crearAbonador(d)("rojo", 12000)).accion).toBe("solo_alerta");
    expect(d.pagar).not.toHaveBeenCalled(); expect(d.saldoUsdc).not.toHaveBeenCalled();
  });
  it("sin llaves de reserva no intenta pagar", async () => {
    const { d } = deps({ reservaSecret: undefined });
    expect((await crearAbonador(d)("rojo", 12000)).accion).toBe("solo_alerta");
    expect(d.pagar).not.toHaveBeenCalled();
  });
  it("no hace nada fuera de rojo", async () => {
    const { d } = deps();
    expect((await crearAbonador(d)("amarillo", 13000)).accion).toBe("nada");
    expect(d.leerPrestamo).not.toHaveBeenCalled();
  });
  it("si pagar falla avisa y respeta el enfriamiento", async () => {
    const { d } = deps({ pagar: vi.fn(async () => { throw new Error("tx falló"); }) });
    const alLeer = crearAbonador(d);
    await alLeer("rojo", 12000);
    expect((d.telegram.enviar as any).mock.calls[0][1]).toMatch(/falló/);
    expect((await alLeer("rojo", 12000)).accion).toBe("enfriando");
  });
});

describe("simular caída", () => {
  it("calcula la salud tras la caída y qué haría el Escudo", () => {
    const t = textoSimulacion(prestamo({ saludBp: 16000 }), 25, true);
    expect(t).toContain("160.00 % → 120.00 %"); expect(t).toContain("🔴");
    expect(t).toMatch(/abonaría 20 USDC/); expect(t).toMatch(/no se envió ninguna transacción/);
  });
  it("amarillo: solo alerta", () => { expect(textoSimulacion(prestamo({ saludBp: 16000 }), 10, true)).toMatch(/144.00 %[\s\S]*alerta amarilla/); });
  it("sin caída fuerte: nada", () => { expect(textoSimulacion(prestamo({ saludBp: 20000 }), 5, false)).toMatch(/no haría nada/); });
  it("automático apagado: avisaría", () => { expect(textoSimulacion(prestamo({ saludBp: 16000 }), 40, false)).toMatch(/liquidar[\s\S]*avisaría/); });
  it("sin deuda", () => { expect(textoSimulacion(prestamo({ saludBp: null }), 50, true)).toMatch(/no tiene deuda/); });
  it("lee el porcentaje", () => {
    expect(leerPorcentaje("/simular 30")).toBe(30); expect(leerPorcentaje("/simular 12,5%")).toBe(12.5);
    expect(leerPorcentaje("/simular")).toBeNull(); expect(leerPorcentaje("/simular 100")).toBeNull(); expect(leerPorcentaje("/simular x")).toBeNull();
  });
  it("comando /simular en el bot no manda transacciones", async () => {
    const d = { telegram: { enviar: vi.fn(), obtenerActualizaciones: vi.fn() } as any, leerPrestamo: vi.fn(async () => prestamo({ saludBp: 16000 })), txid: "x", abonoAuto: true };
    expect(await responder("/simular 25", d)).toContain("120.00 %");
    expect(await responder("/simular", d)).toMatch(/Uso/);
  });
});
