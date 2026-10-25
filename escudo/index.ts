// Uso: npm run escudo
import "dotenv/config";
import { leerPrestamo } from "../writz/client.js";
import { crearTelegram } from "./telegram.js";
import { leerConfig } from "./config.js";
import { escuchar } from "./bot.js";

const cfg = leerConfig();
const telegram = crearTelegram(cfg.token);
console.log("Escudo escuchando comandos de Telegram…");
await escuchar({ telegram, leerPrestamo, txid: cfg.txid, chatId: cfg.chatId });
