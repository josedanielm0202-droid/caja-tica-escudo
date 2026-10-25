import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { clasificarOperacion, movimientosDeHorizon, textoRelativo } from "./feedHistorial";
import { cuentaDemo, parsearTransaccionesDemo } from "./parsearTransacciones";

const MD = `# Transacciones reales del demo (testnet, 24-oct-2026)

Cuenta demo: [GCRX…](https://stellar.expert/explorer/testnet/account/GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF)

| Paso | Enlace | Resultado |
|---|---|---|
| BTC a la bóveda | [abc](https://mempool.space/signet/tx/${"ab".repeat(32)}) | bóveda |
| Trustline USDC demo | [t](https://stellar.expert/explorer/testnet/tx/${"11".repeat(32)}) | |
| \`deposit\` | [d](https://stellar.expert/explorer/testnet/tx/${"22".repeat(32)}) | posición Active |
| \`borrow\` 3 USDC | [b](https://stellar.expert/explorer/testnet/tx/${"33".repeat(32)}) | deuda 3 |
| \`transfer\` 1 USDC | [x](https://stellar.expert/explorer/testnet/tx/${"44".repeat(32)}) | fondea |
| \`repay\` 1 USDC | [r](https://stellar.expert/explorer/testnet/tx/${"55".repeat(32)}) | deuda 2 |
| liquidación parcial | [l](https://stellar.expert/explorer/testnet/tx/${"66".repeat(32)}) | |
`;

describe("parseo de docs/transacciones.md", () => {
  it("clasifica depósito, préstamo, pago y liquidación", () => {
    const filas = parsearTransaccionesDemo(MD);
    expect(filas.map((fila) => fila.tipo)).toEqual([
      "deposito",
      "otro",
      "deposito",
      "prestamo",
      "pago",
      "pago",
      "liquidacion",
    ]);
    expect(filas[3]?.hash).toBe("33".repeat(32));
    expect(filas[0]?.hash).toBe("ab".repeat(32));
    expect(filas[0]?.fecha).toBe("24 oct 2026");
    expect(filas[3]?.enlace).toContain("stellar.expert");
    expect(cuentaDemo(MD)).toBe("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");
  });

  it("lee el archivo real del repo", () => {
    const real = readFileSync(new URL("../../../docs/transacciones.md", import.meta.url), "utf8");
    const filas = parsearTransaccionesDemo(real);
    expect(filas.map((fila) => fila.tipo)).toEqual([
      "deposito",
      "otro",
      "otro",
      "deposito",
      "prestamo",
      "pago",
      "pago",
    ]);
    expect(filas.filter((fila) => fila.enlace.includes("stellar.expert")).length).toBe(6);
    expect(cuentaDemo(real)).toBe("GCRX6T2XP37JTXCP75WBZOWDM4KIJX3QAAGWAMMKGXZBQZ2NW3KUFJUE");
  });
});

describe("feed de Horizon", () => {
  const borrow = "AAAADwAAAAZib3Jyb3cAAA==";

  it("reconoce borrow, repay y transfer por el símbolo del contrato", () => {
    expect(
      clasificarOperacion({
        type: "invoke_host_function",
        parameters: [{ type: "Sym", value: borrow }],
        asset_balance_changes: [{ asset_code: "USDC", amount: "3.0000000" }],
      }),
    ).toMatchObject({ tipo: "prestamo", titulo: "Préstamo", detalle: "3 USDC" });

    expect(clasificarOperacion({ parameters: [{ type: "Sym", value: b64("repay") }] }).tipo).toBe("pago");
    expect(clasificarOperacion({ parameters: [{ type: "Sym", value: b64("deposit") }] }).tipo).toBe("deposito");
    expect(clasificarOperacion({ parameters: [{ type: "Sym", value: b64("liquidate") }] }).tipo).toBe("liquidacion");
    expect(clasificarOperacion({ type: "payment", asset_code: "USDC", amount: "1" }).tipo).toBe("pago");
  });

  it("arma el enlace a Stellar Expert y se salta lo fallido", () => {
    const items = movimientosDeHorizon({
      _embedded: {
        records: [
          { transaction_hash: "aa".repeat(32), transaction_successful: false, created_at: "2026-10-25T20:00:00Z", type: "payment" },
          {
            transaction_hash: "BB".repeat(32),
            transaction_successful: true,
            created_at: "2026-10-25T20:15:52Z",
            type: "invoke_host_function",
            parameters: [{ type: "Sym", value: b64("transfer") }],
            asset_balance_changes: [{ asset_code: "USDC", amount: "1.5000000" }],
          },
        ],
      },
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.enlace).toBe(`https://stellar.expert/explorer/testnet/tx/${"bb".repeat(32)}`);
    expect(items[0]?.tipo).toBe("pago");
    expect(textoRelativo("2026-10-25T20:15:52Z", Date.parse("2026-10-25T21:15:52Z"))).toBe("hace 1 h");
    expect(textoRelativo("2026-10-25T21:15:30Z", Date.parse("2026-10-25T21:15:52Z"))).toBe("hace un momento");
  });
});

function b64(texto: string): string {
  const cuerpo = texto;
  const len = cuerpo.length;
  const bytes = [0, 0, 0, 15, 0, 0, 0, len, ...[...cuerpo].map((c) => c.charCodeAt(0))];
  while (bytes.length % 4 !== 0) bytes.push(0);
  return btoa(String.fromCharCode(...bytes));
}
