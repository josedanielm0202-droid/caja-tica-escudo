// Lado Bitcoin (Signet): bóveda P2WSH de Writz y la firma key_sig (BIP-137).
// Replica byte a byte frontend/app/src/lib/bitcoin/{address,keyProof}.ts de WritzProtocol/writz.
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "@bitcoinerlab/secp256k1";
import { ECPairFactory } from "ecpair";
import bitcoinMessage from "bitcoinjs-message";
import { WRITZ } from "./config.js";

bitcoin.initEccLib(ecc);
export const ECPair = ECPairFactory(ecc);
export const SIGNET = bitcoin.networks.testnet; // signet usa los mismos prefijos (tb1)

export function redeemScript(protocolPubkeyHex: string, userPubkeyHex: string, timelockHeight: number): Uint8Array {
  const p = Buffer.from(protocolPubkeyHex, "hex"); const u = Buffer.from(userPubkeyHex, "hex");
  if (p.length !== 33 || u.length !== 33) throw new Error("Las llaves deben ser comprimidas de 33 bytes");
  if (timelockHeight < 100_000) throw new Error("timelockHeight debe ser >= 100000");
  const o = bitcoin.opcodes;
  return bitcoin.script.compile([o.OP_IF, p, o.OP_CHECKSIGVERIFY, u, o.OP_CHECKSIG, o.OP_ELSE,
    bitcoin.script.number.encode(timelockHeight), o.OP_CHECKLOCKTIMEVERIFY, o.OP_DROP, u, o.OP_CHECKSIG, o.OP_ENDIF]);
}

/** Dirección de la bóveda (a donde se manda el BTC) y su scriptPubKey (arg p2wsh_script_pubkey de deposit). */
export function bovedaWritz(userPubkeyHex: string, timelockHeight: number, protocolPubkeyHex: string = WRITZ.protocolBtcPubkey) {
  const redeem = redeemScript(protocolPubkeyHex, userPubkeyHex, timelockHeight);
  const pay = bitcoin.payments.p2wsh({ redeem: { output: redeem, network: SIGNET }, network: SIGNET });
  return { address: pay.address!, scriptPubKey: pay.output!, redeemScript: redeem };
}

/** Texto exacto que firma la llave BTC (spv-types::key_proof::deposit_message). */
export function mensajeDeposito(contractId: string, depositor: string, txidDisplayHex: string): string {
  return `Writz deposit\ncontract:${contractId}\ndepositor:${depositor}\ntxid:${txidDisplayHex.toLowerCase()}`;
}

/** key_sig de 65 bytes (header, r, s) firmado con la WIF del usuario. */
export function firmarKeySig(wif: string, contractId: string, depositor: string, txidDisplayHex: string): Uint8Array {
  const kp = ECPair.fromWIF(wif, SIGNET);
  const sig = bitcoinMessage.sign(mensajeDeposito(contractId, depositor, txidDisplayHex), Buffer.from(kp.privateKey!), true);
  if (sig.length !== 65 || sig[0] < 31 || sig[0] > 34) throw new Error("Firma inesperada");
  return sig;
}

/** Timelock sugerido: ~30 días (4320 bloques) sobre la punta. El contrato exige 1008..105000 sobre el bloque que confirma. */
export const timelockSugerido = (tip: number) => tip + 4320;
