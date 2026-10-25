import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { txidDeEntorno } from "./txid";

export type FuenteTxid = "query" | "env" | "ejemplo" | "ninguna";

/**
 * El txid del préstamo: `?txid=` gana, si no está se usa `VITE_TXID_DEMO`.
 * `?ejemplo=1` muestra los datos de ejemplo aunque el entorno tenga txid.
 */
export function useTxidActivo() {
  const [params, setParams] = useSearchParams();
  const deQuery = (params.get("txid") ?? "").trim();
  const forzarEjemplo = params.get("ejemplo") === "1";
  const deEnv = txidDeEntorno();
  const crudo = forzarEjemplo ? "" : deQuery || deEnv;
  const fuente: FuenteTxid = forzarEjemplo ? "ejemplo" : deQuery ? "query" : crudo ? "env" : "ninguna";

  const fijar = useCallback(
    (valor: string) => {
      const next = new URLSearchParams(params);
      const limpio = valor.trim();
      next.delete("ejemplo");
      if (limpio) next.set("txid", limpio);
      else next.delete("txid");
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const verEjemplo = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete("txid");
    next.set("ejemplo", "1");
    setParams(next, { replace: true });
  }, [params, setParams]);

  return { crudo, fuente, fijar, verEjemplo, busqueda: params.toString() };
}
