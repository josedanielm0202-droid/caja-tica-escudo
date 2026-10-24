import { describe, it, expect } from "vitest";
import bitcoinMessage from "bitcoinjs-message";
import { ECPair, SIGNET, bovedaWritz, firmarKeySig, mensajeDeposito, redeemScript } from "../writz/btc.js";
import { WRITZ } from "../writz/config.js";

const kp = ECPair.fromPrivateKey(Buffer.alloc(32, 7), { network: SIGNET });
const pub = Buffer.from(kp.publicKey).toString("hex");
const TX = "AB".repeat(32);

describe("bóveda Writz (P2WSH 2-de-2 + timelock)", () => {
  it("script de 114 bytes y dirección tb1q de Signet", () => {
    expect(redeemScript(WRITZ.protocolBtcPubkey, pub, 332_000).length).toBe(114);
    const b = bovedaWritz(pub, 332_000);
    expect(b.address.startsWith("tb1q")).toBe(true);
    expect(b.scriptPubKey.length).toBe(34);
  });
  it("timelock distinto => dirección distinta; timelock bajo se rechaza", () => {
    expect(bovedaWritz(pub, 332_000).address).not.toBe(bovedaWritz(pub, 332_001).address);
    expect(() => redeemScript(WRITZ.protocolBtcPubkey, pub, 99_999)).toThrow();
  });
});

describe("key_sig (BIP-137)", () => {
  it("mensaje exacto con txid en minúscula", () => {
    expect(mensajeDeposito("CX", "GY", TX)).toBe(`Writz deposit\ncontract:CX\ndepositor:GY\ntxid:${TX.toLowerCase()}`);
  });
  it("firma de 65 bytes verificable con la llave del usuario", () => {
    const sig = firmarKeySig(kp.toWIF(), WRITZ.contracts.writzLend, "GDEMO", TX);
    expect(sig.length).toBe(65);
    const addr = (require("bitcoinjs-lib") as typeof import("bitcoinjs-lib")).payments.p2pkh({ pubkey: Buffer.from(kp.publicKey), network: SIGNET }).address!;
    expect(bitcoinMessage.verify(mensajeDeposito(WRITZ.contracts.writzLend, "GDEMO", TX), addr, Buffer.from(sig), SIGNET.messagePrefix)).toBe(true);
  });
});
