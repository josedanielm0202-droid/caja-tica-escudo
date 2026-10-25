import { WRITZ } from "../../../writz/config";
import { describe, expect, it } from "vitest";
import {
  esRedDePrueba,
  firmanteDeSesion,
  firmarConCliente,
  xdrFirmado,
} from "./firmante";

describe("firmante de Freighter", () => {
  it("devuelve el XDR firmado y manda la passphrase con la cuenta", async () => {
    let recibido: unknown;
    const firmado = await firmarConCliente(
      {
        async signTransaction(xdr, opciones) {
          recibido = { xdr, opciones };
          return { signedTxXdr: "XDR-FIRMADO" };
        },
      },
      "XDR-LIMPIO",
      WRITZ.networkPassphrase,
      "GABC",
    );
    expect(firmado).toBe("XDR-FIRMADO");
    expect(recibido).toEqual({
      xdr: "XDR-LIMPIO",
      opciones: { networkPassphrase: WRITZ.networkPassphrase, address: "GABC" },
    });
  });

  it("explica cuando la persona rechaza la firma", async () => {
    await expect(
      firmarConCliente(
        {
          async signTransaction() {
            return { error: { code: 1, message: "The user rejected this request." } };
          },
        },
        "X",
        WRITZ.networkPassphrase,
        "GABC",
      ),
    ).rejects.toThrow("Rechazaste la firma en Freighter.");
  });

  it("no arma un firmante fuera de testnet", () => {
    const firmar = async () => "X";
    expect(firmanteDeSesion("GABC", false, firmar)).toBeNull();
    expect(firmanteDeSesion(null, true, firmar)).toBeNull();
    expect(esRedDePrueba(WRITZ.networkPassphrase)).toBe(true);
    expect(esRedDePrueba("Public Global Stellar Network ; September 2015")).toBe(false);
    expect(firmanteDeSesion("GABC", true, firmar)?.publicKey).toBe("GABC");
  });

  it("falla si Freighter no manda el XDR", () => {
    expect(() => xdrFirmado({})).toThrow("no devolvió");
  });
});
