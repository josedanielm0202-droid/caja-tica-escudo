import { Address, nativeToScVal } from "@stellar/stellar-sdk";
import { enviar, type Firmante } from "../../../writz/client";
import { WRITZ } from "../../../writz/config";
import { usdcAStroops } from "../../../writz/units";

/** Cuenta pública de Stellar (G…). */
export function destinoValido(cuenta: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(cuenta.trim());
}

/**
 * Transfiere USDC de prueba en testnet con el firmante de Freighter.
 * `enviar` ya acepta `{ publicKey, firmar }`. No es un retiro a colones.
 */
export function pagarUsdcTestnet(
  monto: string,
  destino: string,
  firmante: Extract<Firmante, { publicKey: string }>,
) {
  const hacia = destino.trim();
  if (!destinoValido(hacia)) throw new Error("La cuenta destino no es válida.");
  return enviar(
    firmante,
    "transfer",
    [
      new Address(firmante.publicKey).toScVal(),
      new Address(hacia).toScVal(),
      nativeToScVal(usdcAStroops(monto), { type: "i128" }),
    ],
    undefined,
    WRITZ.contracts.usdc,
  );
}
