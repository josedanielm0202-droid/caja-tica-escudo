import { WRITZ } from "../../../writz/config";
import type { ClienteFirma, FirmanteWeb, ResultadoFirma } from "./tipos";

export function esRedDePrueba(passphrase: string | null | undefined): boolean {
  return passphrase === WRITZ.networkPassphrase;
}

export function redDesdeFreighter(nombre: string, passphrase: string) {
  return {
    nombre: nombre || "desconocida",
    passphrase,
    esTestnet: esRedDePrueba(passphrase),
  };
}

export function mensajeFreighter(error: ResultadoFirma["error"]): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  return error.message ?? "";
}

/** Traduce la respuesta de Freighter al XDR firmado, o lanza un error claro. */
export function xdrFirmado(resultado: ResultadoFirma): string {
  const mensaje = mensajeFreighter(resultado.error);
  if (mensaje) {
    if (/reject/i.test(mensaje)) {
      throw new Error("Rechazaste la firma en Freighter.");
    }
    throw new Error(mensaje);
  }
  if (!resultado.signedTxXdr) {
    throw new Error("Freighter no devolvió la transacción firmada.");
  }
  return resultado.signedTxXdr;
}

/**
 * Arma la llamada que writz/client.ts hace: `firmar(xdr, passphrase)`.
 * Solo se manda `networkPassphrase` (en Freighter 6, si también va `network`, la frase se ignora).
 */
export async function firmarConCliente(
  cliente: ClienteFirma,
  xdr: string,
  passphrase: string,
  publicKey: string,
): Promise<string> {
  const resultado = await cliente.signTransaction(xdr, {
    networkPassphrase: passphrase,
    address: publicKey,
  });
  return xdrFirmado(resultado);
}

/** Sin testnet no hay firmante: la página puede mostrar la cuenta, pero no firma. */
export function firmanteDeSesion(
  publicKey: string | null,
  esTestnet: boolean,
  firmar: FirmanteWeb["firmar"],
): FirmanteWeb | null {
  if (!publicKey || !esTestnet) return null;
  return { publicKey, firmar };
}

export function acortarClave(publicKey: string): string {
  if (publicKey.length <= 10) return publicKey;
  return `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`;
}

/** Emisor de USDC de Circle en testnet. writz/README.md lo abrevia USDC:GBBD47IF…FLA5. */
export const USDC_ACTIVO_PRUEBA = "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

export function clasificarErrorSaldo(error: unknown): "sin-cuenta" | "fallo" {
  const texto = error instanceof Error ? error.message : String(error);
  if (/trustline|not found|MissingValue|does not exist|nonexistent|balance entry|Error\(Storage|account does/i.test(texto)) {
    return "sin-cuenta";
  }
  return "fallo";
}
