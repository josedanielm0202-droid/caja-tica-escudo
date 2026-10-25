// Uso: npm run escudo:riesgo — servidor de consulta de riesgo pagada con x402.
import "dotenv/config";
import { leerPrestamo } from "../writz/client.js";
import { crearServidorRiesgo, facilitadorHttp, leerConfigRiesgo } from "./riesgo.js";

const cfg = leerConfigRiesgo();
crearServidorRiesgo({ config: cfg, facilitador: facilitadorHttp(cfg.facilitadorUrl), leerPrestamo: (t) => leerPrestamo(t) })
  .listen(cfg.puerto, () => console.log(`Riesgo x402: http://localhost:${cfg.puerto}/riesgo/:txid (precio ${cfg.precio}, facilitador ${cfg.facilitadorUrl})`));
