// Crea (una sola vez) la llave BTC Signet del demo y la dirección de la bóveda Writz.
// Guarda la WIF solo en .env. Imprime solo datos públicos.
import "dotenv/config";
import { appendFileSync } from "node:fs";
import { ECPair, SIGNET, bovedaWritz, timelockSugerido } from "../writz/btc.js";

let wif = process.env.BTC_USER_WIF, timelock = Number(process.env.BTC_TIMELOCK || 0);
if (!wif) {
  wif = ECPair.makeRandom({ network: SIGNET }).toWIF();
  const tip = Number(await (await fetch("https://mempool.space/signet/api/blocks/tip/height")).text());
  timelock = timelockSugerido(tip);
  appendFileSync(".env", `BTC_USER_WIF=${wif}\nBTC_TIMELOCK=${timelock}\n`);
}
const pub = Buffer.from(ECPair.fromWIF(wif, SIGNET).publicKey).toString("hex");
const b = bovedaWritz(pub, timelock);
console.log(JSON.stringify({ userPubkey: pub, timelock, boveda: b.address, scriptPubKey: Buffer.from(b.scriptPubKey).toString("hex") }, null, 2));
