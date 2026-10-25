import { useCallback, useEffect, useState } from "react";
import { leerPrestamo, type Prestamo } from "../../../writz/client";
import { txidValido } from "./txid";

const INTERVALO_MS = 30_000;

export type LecturaPrestamo =
  | { tipo: "sin-txid" }
  | { tipo: "invalido"; txid: string }
  | { tipo: "cargando"; txid: string }
  | { tipo: "vacio"; txid: string }
  | { tipo: "error"; txid: string; mensaje: string }
  | {
      tipo: "listo";
      txid: string;
      prestamo: Prestamo;
      actualizando: boolean;
      errorRefresco: string | null;
    };

function mensajeLectura(error: unknown): string {
  const texto = error instanceof Error ? error.message : "No se pudo hablar con la red de prueba.";
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (/txid debe tener 32 bytes/i.test(limpio)) {
    return "El txid tiene que ser 64 caracteres hexadecimales.";
  }
  if (limpio.length > 180) return `${limpio.slice(0, 177)}…`;
  return limpio || "No se pudo hablar con la red de prueba.";
}

/** Lee `leerPrestamo` y lo vuelve a pedir cada 30 segundos. */
export function useLecturaPrestamo(crudo: string): LecturaPrestamo & { releer: () => void } {
  const [intento, setIntento] = useState(0);
  const [estado, setEstado] = useState<LecturaPrestamo>({ tipo: "sin-txid" });
  const releer = useCallback(() => setIntento((n) => n + 1), []);

  const txid = crudo.trim().toLowerCase();

  useEffect(() => {
    if (!txid || !txidValido(txid)) return;

    let cancelado = false;

    const aplicar = (prestamo: Prestamo | null) => {
      if (cancelado) return;
      setEstado(prestamo ? { tipo: "listo", txid, prestamo, actualizando: false, errorRefresco: null } : { tipo: "vacio", txid });
    };

    const fallar = (error: unknown, inicial: boolean) => {
      if (cancelado) return;
      const mensaje = mensajeLectura(error);
      setEstado((prev) => {
        if (!inicial && prev.tipo === "listo" && prev.txid === txid) {
          return { ...prev, actualizando: false, errorRefresco: mensaje };
        }
        return { tipo: "error", txid, mensaje };
      });
    };

    const leer = (inicial: boolean) => {
      setEstado((prev) => {
        if (prev.tipo === "listo" && prev.txid === txid) {
          return { ...prev, actualizando: true, errorRefresco: null };
        }
        return { tipo: "cargando", txid };
      });
      leerPrestamo(txid).then(aplicar, (error: unknown) => fallar(error, inicial));
    };

    leer(true);
    const id = window.setInterval(() => leer(false), INTERVALO_MS);
    return () => {
      cancelado = true;
      window.clearInterval(id);
    };
  }, [txid, intento]);

  if (!txid) return { tipo: "sin-txid", releer };
  if (!txidValido(txid)) return { tipo: "invalido", txid, releer };
  if (!("txid" in estado) || estado.txid !== txid) return { tipo: "cargando", txid, releer };
  return { ...estado, releer };
}
