import {
  WatchWalletChanges,
  getAddress,
  getNetwork,
  getNetworkDetails,
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";
import { saldoUsdc } from "../../../writz/client";
import { firmarConCliente, mensajeFreighter, redDesdeFreighter } from "./firmante";
import type { PasaporteBilletera, SesionBilletera } from "./tipos";

function asegurarDireccion(address: string, error: { message?: string } | string | undefined): string {
  const mensaje = mensajeFreighter(error);
  if (mensaje) {
    if (/reject/i.test(mensaje)) {
      throw new Error("Cerraste Freighter sin autorizar. Podés intentar de nuevo.");
    }
    throw new Error(mensaje);
  }
  if (!address) throw new Error("Freighter no devolvió la cuenta.");
  return address;
}

async function leerRed() {
  const detalles = await getNetworkDetails();
  if (!detalles.error && detalles.networkPassphrase) {
    return redDesdeFreighter(detalles.network, detalles.networkPassphrase);
  }
  const red = await getNetwork();
  if (!red.error && red.networkPassphrase) {
    return redDesdeFreighter(red.network, red.networkPassphrase);
  }
  const mensaje = mensajeFreighter(detalles.error) || mensajeFreighter(red.error);
  throw new Error(mensaje || "No se pudo leer la red de Freighter.");
}

async function sesionDesde(address: string, error: { message?: string } | string | undefined): Promise<SesionBilletera> {
  return { publicKey: asegurarDireccion(address, error), red: await leerRed() };
}

export const pasaporteFreighter: PasaporteBilletera = {
  id: "freighter",
  nombre: "Freighter",

  async detectar() {
    try {
      const resultado = await isConnected();
      return Boolean(resultado.isConnected);
    } catch {
      return false;
    }
  },

  async leerPermitida() {
    const dir = await getAddress();
    if (dir.error || !dir.address) return null;
    return { publicKey: dir.address, red: await leerRed() };
  },

  async conectar() {
    const acceso = await requestAccess();
    return sesionDesde(acceso.address, acceso.error);
  },

  firmar(xdr, passphrase, publicKey) {
    return firmarConCliente({ signTransaction }, xdr, passphrase, publicKey);
  },

  vigilar(alCambiar) {
    const watcher = new WatchWalletChanges(3000);
    watcher.watch((cambio) => {
      if (cambio.error) return;
      if (!cambio.address && !cambio.networkPassphrase) return;
      alCambiar({
        publicKey: cambio.address,
        red: redDesdeFreighter(cambio.network, cambio.networkPassphrase),
      });
    });
    return () => watcher.stop();
  },

  leerSaldo(publicKey) {
    return saldoUsdc(publicKey);
  },
};
