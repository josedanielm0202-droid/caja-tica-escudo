// Uso: npm run depositar -- <txid Signet en orden display>
// Requiere que el BTC ya esté en la bóveda (npm run boveda) con >= 1 confirmación.
import "dotenv/config";
import { appendFileSync } from "node:fs";
import { ECPair, SIGNET, bovedaWritz, firmarKeySig } from "../writz/btc.js";
import { depositar, leerPrestamo } from "../writz/client.js";
import { WRITZ } from "../writz/config.js";

const txidDisplay = process.argv[2]; if (!txidDisplay) throw new Error("Falta el txid de Signet");
const { BTC_USER_WIF: wif, BTC_TIMELOCK, DEMO_SECRET, DEMO_PUBLIC } = process.env as Record<string, string>;
const pub = Buffer.from(ECPair.fromWIF(wif, SIGNET).publicKey).toString("hex");
const b = bovedaWritz(pub, Number(BTC_TIMELOCK));
const keySig = firmarKeySig(wif, WRITZ.contracts.writzLend, DEMO_PUBLIC, txidDisplay);
const r = await depositar({ txidDisplay, scriptPubKeyHex: Buffer.from(b.scriptPubKey).toString("hex"), timelockHeight: Number(BTC_TIMELOCK), userPubkeyHex: pub, keySig }, { secret: DEMO_SECRET });
appendFileSync(".env", `LOAN_TXID=${r.txid}\n`);
console.log("Depósito registrado:", r.enlace, "\nPréstamo:", await leerPrestamo(r.txid));
