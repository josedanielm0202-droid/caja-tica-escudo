import { describe, expect, it } from "vitest";
import { txidDeEntorno, txidValido } from "./txid";

describe("txid del demo", () => {
  it("acepta 64 hex con espacios alrededor", () => {
    expect(txidValido(` ${"ab".repeat(32)} `)).toBe(true);
    expect(txidValido("AB".repeat(32))).toBe(true);
  });

  it("rechaza corto, impar y lo que no es hex", () => {
    expect(txidValido("abc")).toBe(false);
    expect(txidValido("zz".repeat(32))).toBe(false);
    expect(txidValido("")).toBe(false);
  });

  it("lee VITE_TXID_DEMO y recorta espacios", () => {
    expect(txidDeEntorno({ VITE_TXID_DEMO: "  abc  " })).toBe("abc");
    expect(txidDeEntorno({})).toBe("");
  });
});
