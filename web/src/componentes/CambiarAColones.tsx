import { useEffect, useRef, useState } from "react";
import { useBilletera } from "../billetera/useBilletera";
import {
  activosRetiro,
  agregarTrustline,
  autenticar,
  dominioAnchor,
  elegirActivo,
  errorSencillo,
  estadoRetiro,
  faseDeEstado,
  iniciarRetiro,
  leerToml,
  tieneTrustline,
  type InfoToml,
  type MonedaToml,
} from "../lib/anchor";

type Fase = "inicio" | "conectando" | "falta-trustline" | "esperando-datos" | "en-proceso" | "listo" | "error";

const TEXTO_FASE: Record<Fase, string> = {
  inicio: "",
  conectando: "Conectando con el socio…",
  "falta-trustline": "Tu cuenta todavía no acepta esta moneda.",
  "esperando-datos": "Esperando tus datos en la ventana del socio…",
  "en-proceso": "El socio está procesando el retiro…",
  listo: "¡Listo! El socio completó el retiro.",
  error: "",
};

export function CambiarAColones() {
  const billetera = useBilletera();
  const dominio = dominioAnchor(import.meta.env.VITE_ANCHOR_DOMAIN);
  const [fase, setFase] = useState<Fase>("inicio");
  const [error, setError] = useState<string | null>(null);
  const [moneda, setMoneda] = useState<MonedaToml | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<string | null>(null);
  const sesion = useRef<{ info: InfoToml; jwt: string; id: string } | null>(null);
  const firmante = billetera.firmante;

  useEffect(() => {
    if (fase !== "esperando-datos" && fase !== "en-proceso") return;
    const s = sesion.current;
    if (!s) return;
    const t = setInterval(async () => {
      try {
        const tx = await estadoRetiro(s.info, s.jwt, s.id);
        const f = faseDeEstado(tx.status);
        setDetalle(`Estado del socio: ${tx.status}`);
        if (f === "error") {
          setError("El socio marcó el retiro con error o vencido. Probá de nuevo.");
          setFase("error");
        } else setFase(f);
      } catch {
        /* reintenta en el próximo ciclo */
      }
    }, 5000);
    return () => clearInterval(t);
  }, [fase]);

  async function empezar() {
    if (!firmante) return;
    setError(null);
    setDetalle(null);
    setFase("conectando");
    try {
      const info = await leerToml(dominio);
      const codigo = elegirActivo(await activosRetiro(info));
      if (!codigo) throw new Error("El socio no tiene monedas habilitadas para retiro.");
      const m = info.monedas.find((x) => x.code === codigo) ?? { code: codigo };
      setMoneda(m);
      if (!(await tieneTrustline(firmante.publicKey, m))) {
        setFase("falta-trustline");
        return;
      }
      const jwt = await autenticar(info, firmante.publicKey, firmante.firmar);
      const r = await iniciarRetiro(info, jwt, codigo, firmante.publicKey);
      sesion.current = { info, jwt, id: r.id };
      setUrl(r.url);
      window.open(r.url, "anchor-sep24", "width=480,height=720");
      setFase("esperando-datos");
    } catch (causa) {
      setError(errorSencillo(causa));
      setFase("error");
    }
  }

  async function confiar() {
    if (!firmante || !moneda) return;
    setFase("conectando");
    try {
      await agregarTrustline(firmante.publicKey, moneda, firmante.firmar);
      await empezar();
    } catch (causa) {
      setError(errorSencillo(causa));
      setFase("error");
    }
  }

  const ocupado = fase === "conectando";
  return (
    <section className="tarjeta" aria-labelledby="anchor-titulo">
      <p className="kicker">Anchor de Stellar · SEP-24</p>
      <h2 id="anchor-titulo">Cambiar a colones</h2>
      <p className="aviso">Demo con el socio de prueba de Stellar. En producción: MoneyGram u otro anchor con SINPE.</p>
      <p className="suave">
        Socio: <span className="mono">{dominio}</span>. Se abre su ventanilla para que pongás tus datos y el monto.
      </p>
      {!firmante ? <p className="suave">Conectá Freighter en testnet para usar el socio.</p> : null}
      {TEXTO_FASE[fase] ? (
        <p className={fase === "listo" ? "ok" : "suave"} role="status">
          {TEXTO_FASE[fase]}
          {moneda && fase !== "listo" ? ` Moneda: ${moneda.code}.` : ""}
        </p>
      ) : null}
      {detalle ? <p className="suave mono">{detalle}</p> : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {url && (fase === "esperando-datos" || fase === "en-proceso") ? (
        <p>
          <a href={url} target="_blank" rel="noreferrer">
            Abrir otra vez la ventanilla del socio
          </a>
        </p>
      ) : null}
      <div className="acciones">
        {fase === "falta-trustline" ? (
          <button type="button" className="boton" onClick={() => void confiar()}>
            Aceptar {moneda?.code} en mi cuenta
          </button>
        ) : (
          <button type="button" className="boton" disabled={!firmante || ocupado} onClick={() => void empezar()}>
            {ocupado ? "Conectando…" : fase === "inicio" ? "Cambiar a colones" : "Empezar otra vez"}
          </button>
        )}
      </div>
    </section>
  );
}
