// Uso: npm run escudo:prueba — manda un mensaje de prueba al chat configurado.
import "dotenv/config";
import { crearTelegram } from "./telegram.js";
import { leerConfig } from "./config.js";

const cfg = leerConfig();
await crearTelegram(cfg.token).enviar(cfg.chatId, "✅ Prueba del Escudo de Caja Tica: el bot funciona.");
console.log("Mensaje de prueba enviado.");
