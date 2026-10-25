// Uso: npm run escudo — bot de comandos + vigilante de salud + abono automático.
import "dotenv/config";
import { leerPrestamo, pagar, salud, saldoUsdc } from "../writz/client.js";
import { crearTelegram } from "./telegram.js";
import { leerConfig } from "./config.js";
import { escuchar } from "./bot.js";
import { intervaloS, vigilar } from "./vigilante.js";
import { crearServidorSalud, iniciarKeepAlive, keepAliveS, puertoSalud, urlKeepAlive } from "./salud.js";
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
const puerto = puertoSalud();
if (puerto) crearServidorSalud().listen(puerto, () => console.log(`Escudo: salud en http://localhost:${puerto}/salud`));
const urlVivo = urlKeepAlive();
if (urlVivo) {
  iniciarKeepAlive({ url: urlVivo, cadaMs: keepAliveS() * 1000 });
  console.log(`Escudo: keep-alive a ${urlVivo}/salud cada ${keepAliveS()} s.`);
}
await Promise.all([
  escuchar({ telegram, leerPrestamo, txid: cfg.txid, chatId: cfg.chatId, abonoAuto: auto }),
  vigilar({ telegram, salud, txid: cfg.txid, chatId: cfg.chatId, alLeer: async (n, h) => { await alLeer(n, h); } }),
]);
