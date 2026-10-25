import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { textoUsdc } from "../lib/formato";
import { BilleteraCtx } from "./contexto";
import { clasificarErrorSaldo, firmanteDeSesion } from "./firmante";
import { pasaporteActivo } from "./pasaporte";
import type { FirmanteWeb, PasaporteBilletera, RedBilletera, SesionBilletera } from "./tipos";

export type FaseBilletera = "revisando" | "no-instalada" | "lista" | "conectando" | "conectada";

export interface SaldoBilletera {
  estado: "ocioso" | "cargando" | "listo" | "sin-cuenta" | "fallo";
  texto: string | null;
}

export interface EstadoBilletera {
  publicKey: string | null;
  red: RedBilletera | null;
  conectada: boolean;
  instalada: boolean;
  fase: FaseBilletera;
  error: string | null;
  saldo: SaldoBilletera;
  /** null si no hay cuenta o si Freighter no está en la testnet de Writz. */
  firmante: FirmanteWeb | null;
  conectar: () => Promise<void>;
  desconectar: () => void;
  reintentarSaldo: () => void;
}

const SALDO_QUIETO: SaldoBilletera = { estado: "ocioso", texto: null };
const SALDO_CARGANDO: SaldoBilletera = { estado: "cargando", texto: null };

export function BilleteraProvider({ children }: { children: ReactNode }) {
  const pararRef = useRef<(() => void) | null>(null);
  const [pasaporte, setPasaporte] = useState<PasaporteBilletera | null>(null);
  const [fase, setFase] = useState<FaseBilletera>("revisando");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [red, setRed] = useState<RedBilletera | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ clave: string; intento: number; saldo: SaldoBilletera } | null>(
    null,
  );
  const [reintento, setReintento] = useState(0);

  const pararVigilancia = useCallback(() => {
    pararRef.current?.();
    pararRef.current = null;
  }, []);

  const publicar = useCallback((sesion: SesionBilletera) => {
    if (!sesion.publicKey) {
      pararVigilancia();
      setPublicKey(null);
      setRed(null);
      setFase("lista");
      setError("Freighter dejó de compartir la cuenta. Conectá de nuevo cuando quieras.");
      return;
    }
    setPublicKey(sesion.publicKey);
    setRed((anterior) =>
      anterior && anterior.passphrase === sesion.red.passphrase && anterior.nombre === sesion.red.nombre
        ? anterior
        : sesion.red,
    );
    setError(null);
    setFase("conectada");
  }, [pararVigilancia]);

  const observar = useCallback(
    (pasaporte: PasaporteBilletera) => {
      pararVigilancia();
      pararRef.current = pasaporte.vigilar((cambio) => publicar(cambio));
    },
    [pararVigilancia, publicar],
  );

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      try {
        const siguiente = await pasaporteActivo();
        if (cancelado) return;
        setPasaporte(siguiente);
        const instalada = await siguiente.detectar();
        if (cancelado) return;
        if (!instalada) {
          setFase("no-instalada");
          return;
        }
        const sesion = await siguiente.leerPermitida();
        if (cancelado) return;
        if (sesion) {
          publicar(sesion);
          observar(siguiente);
        } else setFase("lista");
      } catch (causa) {
        if (cancelado) return;
        setFase("lista");
        setError(causa instanceof Error ? causa.message : "No se pudo hablar con Freighter.");
      }
    })();
    return () => {
      cancelado = true;
      pararVigilancia();
    };
  }, [observar, pararVigilancia, publicar]);

  useEffect(() => {
    if (!pasaporte || !publicKey || !red?.esTestnet) return;
    let cancelado = false;
    const clave = publicKey;
    const intento = reintento;
    pasaporte.leerSaldo(clave).then(
      (stroops) => {
        if (!cancelado) {
          setResultado({ clave, intento, saldo: { estado: "listo", texto: textoUsdc(stroops) } });
        }
      },
      (causa: unknown) => {
        if (!cancelado) {
          setResultado({ clave, intento, saldo: { estado: clasificarErrorSaldo(causa), texto: null } });
        }
      },
    );
    return () => {
      cancelado = true;
    };
  }, [pasaporte, publicKey, red, reintento]);

  const conectar = useCallback(async () => {
    setError(null);
    const actual = pasaporte ?? (await pasaporteActivo());
    setPasaporte(actual);
    let instalada = fase !== "no-instalada";
    try {
      instalada = await actual.detectar();
    } catch {
      instalada = false;
    }
    if (!instalada) {
      setFase("no-instalada");
      requestAnimationFrame(() => {
        document.getElementById("instalar-freighter")?.scrollIntoView({ block: "nearest" });
      });
      return;
    }
    setFase("conectando");
    try {
      const sesion = await actual.conectar();
      publicar(sesion);
      observar(actual);
    } catch (causa) {
      setFase("lista");
      setError(causa instanceof Error ? causa.message : "No se pudo conectar Freighter.");
    }
  }, [fase, observar, pasaporte, publicar]);

  const desconectar = useCallback(() => {
    pararVigilancia();
    setPublicKey(null);
    setRed(null);
    setError(null);
    setResultado(null);
    setFase("lista");
  }, [pararVigilancia]);

  const reintentarSaldo = useCallback(() => setReintento((n) => n + 1), []);

  const firmar = useCallback(
    (xdr: string, passphrase: string) => {
      if (!pasaporte || !publicKey) {
        return Promise.reject(new Error("No hay billetera conectada en testnet."));
      }
      return pasaporte.firmar(xdr, passphrase, publicKey);
    },
    [pasaporte, publicKey],
  );

  const firmante = useMemo(
    () => firmanteDeSesion(publicKey, Boolean(red?.esTestnet), firmar),
    [publicKey, red, firmar],
  );

  const saldoVisible =
    publicKey && red?.esTestnet
      ? resultado && resultado.clave === publicKey && resultado.intento === reintento
        ? resultado.saldo
        : SALDO_CARGANDO
      : SALDO_QUIETO;

  const valor = useMemo<EstadoBilletera>(
    () => ({
      publicKey,
      red,
      conectada: fase === "conectada" && publicKey !== null,
      instalada: fase !== "revisando" && fase !== "no-instalada",
      fase,
      error,
      saldo: saldoVisible,
      firmante,
      conectar,
      desconectar,
      reintentarSaldo,
    }),
    [publicKey, red, fase, error, saldoVisible, firmante, conectar, desconectar, reintentarSaldo],
  );

  return <BilleteraCtx.Provider value={valor}>{children}</BilleteraCtx.Provider>;
}
