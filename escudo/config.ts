// Lee la configuración del Escudo desde variables de entorno.
export interface ConfigEscudo { token: string; chatId: string; txid: string; }

export function leerConfig(env: Record<string, string | undefined> = process.env): ConfigEscudo {
  const faltan = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "LOAN_TXID"].filter((k) => !env[k]);
  if (faltan.length) throw new Error(`Faltan variables en .env: ${faltan.join(", ")}`);
  return { token: env.TELEGRAM_BOT_TOKEN!, chatId: env.TELEGRAM_CHAT_ID!, txid: env.LOAN_TXID! };
}

export interface Umbrales { rojoBp: number; amarilloBp: number; }
export const UMBRAL_ROJO_DEFECTO_BP = 12_500;
export const UMBRAL_AMARILLO_DEFECTO_BP = 15_000;

const enteroEntre = (v: string | undefined, min: number, max: number): number | null => {
  if (v === undefined || !/^\s*\d+\s*$/.test(v)) return null;
  const n = Number(v);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : null;
};

/**
 * Umbrales del semáforo del Escudo (en bp, 15000 = 150 %).
 * ESCUDO_UMBRAL_ROJO_BP: entero 10000–50000 (por defecto 12500). Inválido => defecto.
 * ESCUDO_UMBRAL_AMARILLO_BP: entero 10000–60000 (por defecto 15000). Debe ser > rojo;
 * si no lo es, se usa rojo + 2500. El abono automático lleva la salud hasta el amarillo
 * (mínimo 150 %), así el préstamo vuelve a verde.
 */
export function leerUmbrales(env: Record<string, string | undefined> = process.env): Umbrales {
  const rojoBp = enteroEntre(env.ESCUDO_UMBRAL_ROJO_BP, 10_000, 50_000) ?? UMBRAL_ROJO_DEFECTO_BP;
  let amarilloBp = enteroEntre(env.ESCUDO_UMBRAL_AMARILLO_BP, 10_000, 60_000) ?? UMBRAL_AMARILLO_DEFECTO_BP;
  if (amarilloBp <= rojoBp) amarilloBp = rojoBp + 2_500;
  return { rojoBp, amarilloBp };
}
