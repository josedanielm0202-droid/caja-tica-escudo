import { useEffect, useRef, useState, type FormEvent } from "react";
import { usdcAStroops, stroopsAUsdc } from "../../../writz/units";
import { COLONES_POR_USDC_EJEMPLO, USDC_PLANILLA_EJEMPLO } from "../datos/ejemplo";
import { textoColones, textoUsdc } from "../lib/formato";
import { useTitulo } from "../lib/titulo";

export function Planilla() {
  useTitulo("Planilla");
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [simulando, setSimulando] = useState(false);
  const [recibo, setRecibo] = useState<{ usdc: string; colones: string } | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  function enviar(ev: FormEvent) {
    ev.preventDefault();
    setRecibo(null);
    let stroops: bigint;
    try {
      stroops = usdcAStroops(texto.trim().replace(",", "."));
    } catch (causa) {
      setError(mensajeMonto(causa));
      return;
    }
    if (stroops > USDC_PLANILLA_EJEMPLO) {
      setError(`Ese monto pasa los ${textoUsdc(USDC_PLANILLA_EJEMPLO)} de ejemplo.`);
      return;
    }
    setError(null);
    setSimulando(true);
    timer.current = window.setTimeout(() => {
      const usdc = Number(stroopsAUsdc(stroops));
      setRecibo({
        usdc: textoUsdc(stroops),
        colones: textoColones(usdc * COLONES_POR_USDC_EJEMPLO),
      });
      setSimulando(false);
    }, 350);
  }

  return (
    <div className="pagina">
      <p className="kicker">Simulado</p>
      <h1>Planilla</h1>
      <p className="lead">Retiro a colones (simulado). No sale plata de tu cuenta ni de un banco.</p>
      <p className="aviso">
        USDC de ejemplo disponibles: {textoUsdc(USDC_PLANILLA_EJEMPLO)}. Tipo de cambio de ejemplo:{" "}
        {textoColones(COLONES_POR_USDC_EJEMPLO)} por USDC. No es la tasa del mercado.
      </p>
      <form className="tarjeta" onSubmit={enviar}>
        <label className="campo" htmlFor="monto">
          ¿Cuánto USDC querés pasar a colones?
          <input
            id="monto"
            inputMode="decimal"
            autoComplete="off"
            placeholder="12.5"
            value={texto}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "error-monto" : "ayuda-monto"}
            onChange={(ev) => {
              setTexto(ev.target.value);
              setError(null);
              setRecibo(null);
            }}
          />
        </label>
        <p className="suave" id="ayuda-monto">
          Usá punto o coma para los decimales, con máximo 7. Por ejemplo: 12.5
        </p>
        {error ? (
          <p className="error" id="error-monto" role="alert">
            {error}
          </p>
        ) : null}
        <button className="boton" type="submit" disabled={simulando || texto.trim() === ""}>
          {simulando ? "Simulando…" : "Simular retiro"}
        </button>
      </form>
      {recibo ? (
        <div className="recibo" role="status">
          <h2>Simulación lista</h2>
          <p>
            Con {recibo.usdc} se verían {recibo.colones}. No salió nada de ningún lado: el retiro a colones
            es simulado.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function mensajeMonto(causa: unknown): string {
  const textoError = causa instanceof Error ? causa.message : "";
  if (textoError.includes("mayor a 0")) return "El monto tiene que ser mayor a cero.";
  return "Escribí el monto con hasta 7 decimales. Por ejemplo: 12.5";
}
