import { useEffect, useState } from "react";
import { movimientosDeHorizon, urlOperaciones, type ItemFeed } from "./feedHistorial";

const INTERVALO_MS = 15_000;

export type FeedHorizon =
  | { tipo: "sin-cuenta" }
  | { tipo: "cargando" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "listo"; items: ItemFeed[]; error: string | null; ahora: number };

/** Lee operaciones de Horizon testnet y las repite cada 15 segundos. */
export function useFeedHorizon(cuenta: string | null): FeedHorizon {
  const [estado, setEstado] = useState<FeedHorizon>({ tipo: "cargando" });

  useEffect(() => {
    if (!cuenta) return;
    let cancelado = false;

    const leer = () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        const mensaje = "Sin conexión. El feed se actualiza cuando vuelva la red.";
        setEstado((prev) => (prev.tipo === "listo" ? { ...prev, error: mensaje } : { tipo: "error", mensaje }));
        return;
      }
      fetch(urlOperaciones(cuenta))
        .then((respuesta) => {
          if (!respuesta.ok) throw new Error(`Horizon respondió ${respuesta.status}.`);
          return respuesta.json() as Promise<unknown>;
        })
        .then((cuerpo) => {
          if (cancelado) return;
          setEstado({ tipo: "listo", items: movimientosDeHorizon(cuerpo), error: null, ahora: Date.now() });
        })
        .catch((causa: unknown) => {
          if (cancelado) return;
          const mensaje = causa instanceof Error ? causa.message : "No se pudo leer el feed.";
          setEstado((prev) =>
            prev.tipo === "listo" ? { ...prev, error: mensaje, ahora: Date.now() } : { tipo: "error", mensaje },
          );
        });
    };

    leer();
    const id = window.setInterval(leer, INTERVALO_MS);
    return () => {
      cancelado = true;
      window.clearInterval(id);
    };
  }, [cuenta]);

  if (!cuenta) return { tipo: "sin-cuenta" };
  return estado;
}
