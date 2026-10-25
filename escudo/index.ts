// Uso: npm run escudo — bot de comandos + vigilante de salud + abono automático.
import "dotenv/config";
import { leerPrestamo, pagar, salud, saldoUsdc } from "../writz/client.js";
import { crearTelegram } from "./telegram.js";
import { leerConfig } from "./config.js";
import { escuchar } from "./bot.js";
import { intervaloS, vigilar } from "./vigilante.js";
import { abonoAutoActivo, crearAbonador, enfriamientoS } from "./abono.js";

const cfg = leerConfig();
const telegram = crearTelegram(cfg.token);
const auto = abonoAutoActivo();
const alLeer = crearAbonador({
  telegram, chatId: cfg.chatId, txid: cfg.txid, auto, enfriamientoMs: enfriamientoS() * 1000,
  reservaPublic: process.env.RESERVA_PUBLIC, reservaSecret: process.env.RESERVA_SECRET,
  leerPrestamo, saldoUsdc, pagar,
});
console.log(`Escudo: revisando cada ${intervaloS()} s, abono automático ${auto ? "ENCENDIDO" : "apagado"}.`);
await Promise.all([
  escuchar({ telegram, leerPrestamo, txid: cfg.txid, chatId: cfg.chatId, abonoAuto: auto }),
  vigilar({ telegram, salud, txid: cfg.txid, chatId: cfg.chatId, alLeer: async (n, h) => { await alLeer(n, h); } }),
]);
