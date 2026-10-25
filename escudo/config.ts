// Lee la configuración del Escudo desde variables de entorno.
export interface ConfigEscudo { token: string; chatId: string; txid: string; }

export function leerConfig(env: Record<string, string | undefined> = process.env): ConfigEscudo {
  const faltan = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "LOAN_TXID"].filter((k) => !env[k]);
  if (faltan.length) throw new Error(`Faltan variables en .env: ${faltan.join(", ")}`);
  return { token: env.TELEGRAM_BOT_TOKEN!, chatId: env.TELEGRAM_CHAT_ID!, txid: env.LOAN_TXID! };
}
