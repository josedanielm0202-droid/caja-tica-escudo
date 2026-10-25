import { Buffer } from "buffer";
import { leerPrestamo } from "../../../writz/client";
import { invertirHex, semaforo, stroopsAUsdc, usdcAStroops } from "../../../writz/units";

export type { Firmante, Prestamo, ResultadoTx } from "../../../writz/client";

/**
 * Comprueba que writz/client.ts y el polyfill de Buffer cargan en el navegador.
 * No llama a la red: leerPrestamo solo se referencia.
 */
export function chequearWritzEnNavegador(): void {
  const hex = "ab".repeat(32);
  if (invertirHex(invertirHex(hex)) !== hex) {
    throw new Error("Buffer no está disponible: no se pudo leer un txid de ejemplo.");
  }
  if (Buffer.from("abcd", "hex").toString("hex") !== "abcd") {
    throw new Error("El paquete buffer no respondió en el navegador.");
  }
  if (semaforo(13_800) !== "amarillo" || semaforo(15_000) !== "verde" || semaforo(12_000) !== "rojo") {
    throw new Error("El semáforo del módulo Writz no respondió como se esperaba.");
  }
  if (stroopsAUsdc(usdcAStroops("12.5")) !== "12.5") {
    throw new Error("La conversión de USDC a stroops no cuadra.");
  }
  if (typeof leerPrestamo !== "function") {
    throw new Error("No se pudo cargar writz/client.ts.");
  }
}
