/**
 * Pasaporte de billetera, alineado con lo que Freighter expone (SEP-43).
 *
 * TODO: otra billetera (Albedo, Freighter móvil o un conector) puede
 * implementar esta misma interfaz y elegirse en `pasaporteActivo()`.
 * Hoy el único pasaporte real es Freighter. No guardes llaves ni seeds:
 * la sesión vive en la extensión, no en esta página.
 */
export interface RedBilletera {
  nombre: string;
  passphrase: string;
  esTestnet: boolean;
}

export interface SesionBilletera {
  publicKey: string;
  red: RedBilletera;
}

export interface PasaporteBilletera {
  id: string;
  nombre: string;
  detectar(): Promise<boolean>;
  /** null si este sitio todavía no está autorizado en la billetera. */
  leerPermitida(): Promise<SesionBilletera | null>;
  conectar(): Promise<SesionBilletera>;
  firmar(xdr: string, passphrase: string, publicKey: string): Promise<string>;
  /** La función que devuelve deja de observar. */
  vigilar(alCambiar: (sesion: SesionBilletera) => void): () => void;
  leerSaldo(publicKey: string): Promise<bigint>;
}

/** Lo que devuelve signTransaction de @stellar/freighter-api. */
export interface ResultadoFirma {
  signedTxXdr?: string;
  error?: { message?: string; code?: number } | string;
}

export interface ClienteFirma {
  signTransaction: (
    xdr: string,
    opts: { networkPassphrase: string; address: string },
  ) => Promise<ResultadoFirma>;
}

/** La forma que writz/client.ts espera de Freighter. Sin `secret`. */
export interface FirmanteWeb {
  publicKey: string;
  firmar: (xdrSinFirmar: string, passphrase: string) => Promise<string>;
}
