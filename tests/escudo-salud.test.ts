// Pruebas del servidor de salud y del keep-alive (sin red real).
import { describe, it, expect, vi, afterEach } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { crearServidorSalud, iniciarKeepAlive, keepAliveS, puertoSalud, urlKeepAlive } from "../escudo/salud.js";

let srv: Server | undefined;
afterEach(() => { srv?.close(); srv = undefined; vi.useRealTimers(); });

describe("servidor de salud", () => {
  it("GET /salud responde 200 ok y otras rutas 404", async () => {
    srv = crearServidorSalud();
    await new Promise<void>((r) => srv!.listen(0, r));
    const base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
    const r = await fetch(`${base}/salud`);
    expect(r.status).toBe(200);
    expect(await r.text()).toBe("ok");
    expect((await fetch(`${base}/otra`)).status).toBe(404);
  });
  it("solo hay puerto si PORT o ESCUDO_PUERTO están", () => {
    expect(puertoSalud({})).toBeUndefined();
    expect(puertoSalud({ PORT: "10000" })).toBe(10000);
    expect(puertoSalud({ PORT: "10000", ESCUDO_PUERTO: "5000" })).toBe(5000);
    expect(puertoSalud({ PORT: "abc" })).toBeUndefined();
  });
});

describe("keep-alive", () => {
  it("lee url e intervalo del entorno", () => {
    expect(urlKeepAlive({})).toBeUndefined();
    expect(urlKeepAlive({ RENDER_EXTERNAL_URL: "https://x.onrender.com/" })).toBe("https://x.onrender.com");
    expect(urlKeepAlive({ RENDER_EXTERNAL_URL: "https://a", ESCUDO_KEEPALIVE_URL: "https://b" })).toBe("https://b");
    expect(keepAliveS({})).toBe(600);
    expect(keepAliveS({ ESCUDO_KEEPALIVE_S: "60" })).toBe(60);
  });
  it("pide /salud en cada intervalo y para al detener", async () => {
    vi.useFakeTimers();
    const f = vi.fn(async () => new Response("ok"));
    const parar = iniciarKeepAlive({ url: "https://x", cadaMs: 600_000, fetch: f as unknown as typeof fetch, log: vi.fn() });
    expect(f).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(600_000);
    expect(f).toHaveBeenCalledWith("https://x/salud");
    await vi.advanceTimersByTimeAsync(1_200_000);
    expect(f).toHaveBeenCalledTimes(3);
    parar();
    await vi.advanceTimersByTimeAsync(600_000);
    expect(f).toHaveBeenCalledTimes(3);
  });
  it("registra fallos sin botar el proceso", async () => {
    vi.useFakeTimers();
    const log = vi.fn();
    const f = vi.fn().mockRejectedValueOnce(new Error("sin red")).mockResolvedValueOnce(new Response("x", { status: 503 }));
    const parar = iniciarKeepAlive({ url: "https://x", cadaMs: 1000, fetch: f as unknown as typeof fetch, log });
    await vi.advanceTimersByTimeAsync(2000);
    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[0][0]).toContain("sin red");
    expect(log.mock.calls[1][0]).toContain("503");
    parar();
  });
});
