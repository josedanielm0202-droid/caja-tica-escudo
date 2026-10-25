import { WRITZ } from "../../../writz/config";
import type { PasaporteBilletera, SesionBilletera } from "./tipos";

/**
 * SOLO desarrollo. No es Freighter: no firma y no llama a la red.
 * `pasaporteActivo` lo carga únicamente si `import.meta.env.DEV` es verdadero,
 * así que el build de producción no lo incluye.
 *
 * Capturas: `?demo-billetera=conectada` o `?demo-billetera=otra-red`.
 */
const CUENTA_DEMO = "GAJ4O4U6U3IPTBMCWDLF4OR5A4NRHFC6SRZK7QADQYELEEC7ZAUITMZ2";

export function pasaporteDemo(modo: "conectada" | "otra-red"): PasaporteBilletera {
  const sesion: SesionBilletera =
    modo === "otra-red"
      ? {
          publicKey: CUENTA_DEMO,
          red: {
            nombre: "PUBLIC",
            passphrase: "Public Global Stellar Network ; September 2015",
            esTestnet: false,
          },
        }
      : {
          publicKey: CUENTA_DEMO,
          red: {
            nombre: "TESTNET",
            passphrase: WRITZ.networkPassphrase,
            esTestnet: true,
          },
        };

  return {
    id: "freighter",
    nombre: "Freighter",
    async detectar() {
      return true;
    },
    async leerPermitida() {
      return sesion;
    },
    async conectar() {
      return sesion;
    },
    async firmar() {
      throw new Error("La billetera de ejemplo no firma.");
    },
    vigilar() {
      return () => {};
    },
    async leerSaldo() {
      return 1_250_000_000n;
    },
  };
}
