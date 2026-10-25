const HEX_64 = /^[0-9a-fA-F]{64}$/;

/** 64 caracteres hex, el orden interno que usa el contrato. */
export function txidValido(valor: string): boolean {
  return HEX_64.test(valor.trim());
}

/** El mismo dato que `LOAN_TXID` en los scripts, expuesto a Vite. */
export function txidDeEntorno(env: { VITE_TXID_DEMO?: string } = import.meta.env): string {
  return (env.VITE_TXID_DEMO ?? "").trim();
}
