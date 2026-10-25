import { describe, expect, it, vi } from "vitest";
import { Account, Keypair, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import {
  autenticar,
  dominioAnchor,
  elegirActivo,
  faseDeEstado,
  iniciarRetiro,
  parsearToml,
  peticionRetiro,
  PASSPHRASE_TESTNET,
  type InfoToml,
} from "./anchor";

const TOML = `
# comentario
SIGNING_KEY = "GSIGN"
NETWORK_PASSPHRASE = "Test SDF Network ; September 2015"
WEB_AUTH_ENDPOINT = "https://ancla.test/auth"
TRANSFER_SERVER_SEP0024 = "https://ancla.test/sep24/"

[[CURRENCIES]]
code = "SRT"
issuer = "GISSUER"

[[CURRENCIES]]
code = "native"

[DOCUMENTATION]
ORG_NAME = "X"
`;

function respuesta(cuerpo: unknown, ok = true) {
  return { ok, json: async () => cuerpo, text: async () => String(cuerpo) } as Response;
}

describe("stellar.toml (SEP-1)", () => {
  it("lee claves y monedas", () => {
    const info = parsearToml(TOML);
    expect(info.signingKey).toBe("GSIGN");
    expect(info.webAuth).toBe("https://ancla.test/auth");
    expect(info.transferServer24).toBe("https://ancla.test/sep24");
    expect(info.monedas).toEqual([{ code: "SRT", issuer: "GISSUER" }, { code: "native", issuer: undefined }]);
  });
  it("falla si no hay SEP-24", () => {
    expect(() => parsearToml('SIGNING_KEY="G"\nWEB_AUTH_ENDPOINT="x"')).toThrow(/SEP-24/);
  });
  it("dominio por defecto y limpio", () => {
    expect(dominioAnchor(undefined)).toBe("testanchor.stellar.org");
    expect(dominioAnchor("https://ancla.cr/")).toBe("ancla.cr");
  });
});

describe("SEP-10", () => {
  const servidor = Keypair.random();
  const cliente = Keypair.random();
  const info: InfoToml = {
    signingKey: servidor.publicKey(),
    webAuth: "https://ancla.test/auth",
    transferServer24: "https://ancla.test/sep24",
    networkPassphrase: PASSPHRASE_TESTNET,
    monedas: [],
  };
  function challenge(origen = cliente.publicKey()) {
    const tx = new TransactionBuilder(new Account(servidor.publicKey(), "-1"), {
      fee: "100",
      networkPassphrase: PASSPHRASE_TESTNET,
    })
      .addOperation(Operation.manageData({ name: "ancla.test auth", value: "abc", source: origen }))
      .setTimeout(300)
      .build();
    tx.sign(servidor);
    return tx.toXDR();
  }

  it("pide, firma y devuelve el JWT", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(respuesta({ transaction: challenge() }))
      .mockResolvedValueOnce(respuesta({ token: "jwt-123" }));
    const firmar = vi.fn(async (xdr: string) => xdr + "");
    const jwt = await autenticar(info, cliente.publicKey(), firmar, f as unknown as typeof fetch);
    expect(jwt).toBe("jwt-123");
    expect(f.mock.calls[0][0]).toBe(`https://ancla.test/auth?account=${cliente.publicKey()}`);
    expect(f.mock.calls[1][1].method).toBe("POST");
    expect(firmar).toHaveBeenCalledOnce();
  });

  it("no firma un challenge para otra cuenta", async () => {
    const f = vi.fn().mockResolvedValueOnce(respuesta({ transaction: challenge(Keypair.random().publicKey()) }));
    const firmar = vi.fn();
    await expect(autenticar(info, cliente.publicKey(), firmar, f as unknown as typeof fetch)).rejects.toThrow(/tu cuenta/);
    expect(firmar).not.toHaveBeenCalled();
  });
});

describe("SEP-24", () => {
  const info = parsearToml(TOML);
  it("arma la petición de retiro", () => {
    const { url, init } = peticionRetiro(info, "jwt", "SRT", "GCUENTA");
    expect(url).toBe("https://ancla.test/sep24/transactions/withdraw/interactive");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer jwt");
    const body = init.body as FormData;
    expect(body.get("asset_code")).toBe("SRT");
    expect(body.get("asset_issuer")).toBe("GISSUER");
    expect(body.get("account")).toBe("GCUENTA");
  });
  it("devuelve id y url", async () => {
    const f = vi.fn().mockResolvedValue(respuesta({ type: "interactive_customer_info_needed", id: "t1", url: "https://x" }));
    await expect(iniciarRetiro(info, "jwt", "SRT", "G", f as unknown as typeof fetch)).resolves.toEqual({ id: "t1", url: "https://x" });
  });
  it("elige activo y traduce estados", () => {
    expect(elegirActivo(["native", "SRT", "USDC"])).toBe("USDC");
    expect(elegirActivo(["native", "SRT"])).toBe("SRT");
    expect(faseDeEstado("incomplete")).toBe("esperando-datos");
    expect(faseDeEstado("pending_user_transfer_start")).toBe("en-proceso");
    expect(faseDeEstado("completed")).toBe("listo");
    expect(faseDeEstado("expired")).toBe("error");
  });
});
