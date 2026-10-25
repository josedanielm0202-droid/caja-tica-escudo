// Uso: npm run escudo — bot de comandos + vigilante de salud al mismo tiempo.
import "dotenv/config";
import { leerPrestamo, salud } from "../writz/client.js";
import { crearTelegram } from "./telegram.js";
import { leerConfig } from "./config.js";
import { escuchar } from "./bot.js";
import { intervaloS, vigilar } from "./vigilante.js";

const cfg = leerConfig();
const telegram = crearTelegram(cfg.token);
console.log(`Escudo escuchando comandos y revisando la salud cada ${intervaloS()} s…`);
await Promise.all([
  escuchar({ telegram, leerPrestamo, txid: cfg.txid, chatId: cfg.chatId }),
  vigilar({ telegram, salud, txid: cfg.txid, chatId: cfg.chatId }),
]);
