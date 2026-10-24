// Pruebas en vivo contra testnet. Solo corren con LIVE=1 (no en CI por defecto).
import { describe, it, expect } from "vitest";
import "dotenv/config";
import { estadoProtocolo, leerPrestamo } from "../writz/client.js";
describe.runIf(process.env.LIVE === "1")("testnet en vivo", () => {
  it("lee el estado del protocolo writz-lend", async () => { expect(await estadoProtocolo()).toHaveProperty("total_borrowed"); }, 30_000);
  it("un txid inexistente no tiene préstamo", async () => { expect(await leerPrestamo("00".repeat(31) + "ab")).toBeNull(); }, 30_000);
  it.runIf(!!process.env.LOAN_TXID)("lee el préstamo del demo", async () => { expect((await leerPrestamo(process.env.LOAN_TXID!))?.estado).toBeDefined(); }, 30_000);
});
