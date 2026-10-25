import { useEffect, useState, type FormEvent } from "react";
import { saldoUsdc } from "../../../writz/client";
import { CambiarAColones } from "../componentes/CambiarAColones";
import { useBilletera } from "../billetera/useBilletera";
import { textoColones, textoTipoCambio } from "../lib/formato";
import { pagarUsdcTestnet } from "../lib/pagarUsdc";
import {
  colonesDeStroops,
  compararConSaldo,
  guardarLineas,
  leerLineas,
  referenciaSimulada,
  stroopsDeLinea,
  tipoCambioEjemplo,
  totalesPlanilla,
  TOPE_LINEAS,
  usdcVisible,
  validarLinea,
  type LineaPlanilla,
  type MonedaLinea,
} from "../lib/planilla";
import { guardarMovimientoSesion } from "../lib/sesionMovimientos";
import { useTitulo } from "../lib/titulo";

type PasoRetiro = "monto" | "confirmar" | "listo";

export function Planilla() {
  useTitulo("Planilla");
  const tasa = tipoCambioEjemplo();
  const billetera = useBilletera();
  const enTestnet = Boolean(billetera.publicKey && billetera.red?.esTestnet);
  const [lineas, setLineas] = useState<LineaPlanilla[]>(() => leerLineas(localStorage));
  const [saldo, setSaldo] = useState<{ clave: string; stroops: bigint } | { clave: string; fallo: true } | null>(null);

  useEffect(() => {
    guardarLineas(localStorage, lineas);
  }, [lineas]);

  useEffect(() => {
    const clave = billetera.publicKey;
    if (!clave || !enTestnet) return;
    let cancelado = false;
    saldoUsdc(clave).then(
      (stroops) => {
        if (!cancelado) setSaldo({ clave, stroops });
      },
      () => {
        if (!cancelado) setSaldo({ clave, fallo: true });
      },
    );
    return () => {
      cancelado = true;
    };
  }, [billetera.publicKey, enTestnet]);

  const totales = totalesPlanilla(lineas, tasa);
  const saldoDeEsta = enTestnet && saldo && saldo.clave === billetera.publicKey ? saldo : null;
  const saldoConocido = saldoDeEsta && "stroops" in saldoDeEsta ? saldoDeEsta.stroops : null;
  const comparacion = compararConSaldo(totales.stroops, enTestnet ? saldoConocido : null);

  function quitar(id: string) {
    setLineas((prev) => prev.filter((linea) => linea.id !== id));
  }

  return (
    <div className="pagina">
      <p className="kicker">Planilla del comercio</p>
      <h1>Planilla</h1>
      <p className="lead">
        Anotá a quién le pagarías. La lista queda solo en este navegador. El retiro a colones, más abajo, es
        una simulación.
      </p>
      <p className="aviso">
        Tipo de cambio de ejemplo: {textoTipoCambio(tasa)}. No es la tasa del mercado y no sale de un banco.
      </p>
      <FormularioLinea
        tasa={tasa}
        lleno={lineas.length >= TOPE_LINEAS}
        onAgregar={(linea) => setLineas((prev) => [...prev, linea].slice(0, TOPE_LINEAS))}
      />
      {lineas.length === 0 ? (
        <p className="suave">Todavía no hay nadie en la planilla.</p>
      ) : (
        <ul className="lista">
          {lineas.map((linea) => (
            <Linea
              key={linea.id}
              linea={linea}
              tasa={tasa}
              saldo={saldoConocido}
              puedeFirmar={Boolean(billetera.firmante)}
              onQuitar={() => quitar(linea.id)}
            />
          ))}
        </ul>
      )}
      <dl className="datos">
        <div>
          <dt>Total en USDC</dt>
          <dd>{usdcVisible(totales.stroops)} USDC</dd>
        </div>
        <div>
          <dt>Total en colones, de ejemplo</dt>
          <dd>{textoColones(totales.colones)}</dd>
        </div>
      </dl>
      <Comparacion
        comparacion={comparacion}
        totales={totales.stroops}
        saldo={saldoConocido}
        cargando={enTestnet && saldoDeEsta === null}
        fallo={Boolean(saldoDeEsta && "fallo" in saldoDeEsta)}
      />
      <CambiarAColones />
      <RetiroSimulado tasa={tasa} saldo={saldoConocido} />
    </div>
  );
}

function FormularioLinea({
  tasa,
  lleno,
  onAgregar,
}: {
  tasa: number;
  lleno: boolean;
  onAgregar: (linea: LineaPlanilla) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [moneda, setMoneda] = useState<MonedaLinea>("crc");
  const [monto, setMonto] = useState("");
  const [destino, setDestino] = useState("");
  const [error, setError] = useState<string | null>(null);

  function enviar(ev: FormEvent) {
    ev.preventDefault();
    const falla = validarLinea({ nombre, moneda, monto, destino }, tasa);
    if (falla) {
      setError(falla);
      return;
    }
    onAgregar({
      id: globalThis.crypto?.randomUUID?.() ?? `linea-${Date.now()}`,
      nombre: nombre.trim(),
      moneda,
      monto: monto.trim().replace(",", "."),
      destino: destino.trim(),
    });
    setNombre("");
    setMonto("");
    setDestino("");
    setError(null);
  }

  return (
    <form className="tarjeta" onSubmit={enviar}>
      <label className="campo" htmlFor="nombre-planilla">
        Nombre
        <input id="nombre-planilla" value={nombre} onChange={(ev) => setNombre(ev.target.value)} autoComplete="name" />
      </label>
      <label className="campo" htmlFor="moneda-planilla">
        Moneda
        <select id="moneda-planilla" value={moneda} onChange={(ev) => setMoneda(ev.target.value as MonedaLinea)}>
          <option value="crc">Colones (CRC)</option>
          <option value="usdc">USDC</option>
        </select>
      </label>
      <label className="campo" htmlFor="monto-planilla">
        Monto
        <input
          id="monto-planilla"
          inputMode="decimal"
          autoComplete="off"
          placeholder={moneda === "crc" ? "150000" : "12.5"}
          value={monto}
          onChange={(ev) => setMonto(ev.target.value)}
        />
      </label>
      <label className="campo" htmlFor="destino-planilla">
        Cuenta Stellar, si vas a pagar USDC de prueba
        <input
          id="destino-planilla"
          className="txid-input"
          value={destino}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="G… opcional"
          onChange={(ev) => setDestino(ev.target.value)}
        />
      </label>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="boton" type="submit" disabled={lleno}>
        {lleno ? `Máximo ${TOPE_LINEAS} personas` : "Agregar a la planilla"}
      </button>
    </form>
  );
}

function Linea({
  linea,
  tasa,
  saldo,
  puedeFirmar,
  onQuitar,
}: {
  linea: LineaPlanilla;
  tasa: number;
  saldo: bigint | null;
  puedeFirmar: boolean;
  onQuitar: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enlace, setEnlace] = useState<string | null>(null);
  const billetera = useBilletera();
  const stroops = stroopsDeLinea(linea, tasa);
  const razon = razonPago(linea, stroops, saldo, puedeFirmar);

  async function pagar() {
    if (razon || !billetera.firmante) return;
    setEnviando(true);
    setError(null);
    try {
      const resultado = await pagarUsdcTestnet(linea.monto, linea.destino, billetera.firmante);
      setEnlace(resultado.enlace);
      guardarMovimientoSesion(localStorage, {
        hash: resultado.hash,
        enlace: resultado.enlace,
        tipo: "pago",
        titulo: `USDC a ${linea.nombre}`,
        cuando: Date.now(),
      });
    } catch (causa) {
      const texto = causa instanceof Error ? causa.message : "No se pudo pagar.";
      setError(texto.length > 220 ? `${texto.slice(0, 217)}…` : texto);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <li className="tarjeta">
      <p className="kicker">{linea.moneda === "crc" ? "Colones" : "USDC"}</p>
      <h2>{linea.nombre}</h2>
      <p>
        {usdcVisible(stroops)} USDC
        {linea.moneda === "crc" ? ` · ${textoColones(Number(linea.monto.replace(",", ".")))} al tipo de ejemplo` : ""}
      </p>
      {linea.destino ? <p className="mono suave">{linea.destino}</p> : null}
      {razon ? <p className="suave">{razon}</p> : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {enlace ? (
        <p>
          <a href={enlace} target="_blank" rel="noreferrer">
            Ver el pago en Stellar Expert
          </a>
        </p>
      ) : null}
      <div className="acciones">
        {linea.moneda === "usdc" && linea.destino ? (
          <button type="button" className="boton" disabled={Boolean(razon) || enviando} onClick={() => void pagar()}>
            {enviando ? "Esperando la firma…" : "Pagar USDC en testnet"}
          </button>
        ) : null}
        <button type="button" className="boton boton--secundario" onClick={onQuitar}>
          Quitar
        </button>
      </div>
    </li>
  );
}

function razonPago(linea: LineaPlanilla, stroops: bigint, saldo: bigint | null, puedeFirmar: boolean): string | null {
  if (linea.moneda !== "usdc" || !linea.destino) return null;
  if (!puedeFirmar) return "Conectá Freighter en testnet para pagar este USDC. El retiro a colones sigue siendo simulado.";
  if (saldo !== null && stroops > saldo) return "No te alcanza el USDC de esta cuenta para esta línea.";
  return null;
}

function Comparacion({
  comparacion,
  totales,
  saldo,
  cargando,
  fallo,
}: {
  comparacion: "sin-saldo" | "alcanza" | "falta";
  totales: bigint;
  saldo: bigint | null;
  cargando: boolean;
  fallo: boolean;
}) {
  if (cargando) return <p className="suave">Estoy leyendo el USDC de tu cuenta…</p>;
  if (fallo) return <p className="error">No pude leer el saldo USDC. La planilla igual queda guardada acá.</p>;
  if (comparacion === "sin-saldo") {
    return <p className="suave">Conectá Freighter en testnet para comparar este total con tu USDC.</p>;
  }
  if (comparacion === "alcanza") {
    return (
      <p className="ok" role="status">
        Te alcanza: tenés {usdcVisible(saldo ?? 0n)} USDC y la planilla suma {usdcVisible(totales)} USDC.
      </p>
    );
  }
  return (
    <p className="error" role="status">
      Te faltan {usdcVisible(totales - (saldo ?? 0n))} USDC. Tenés {usdcVisible(saldo ?? 0n)} USDC y la planilla suma {usdcVisible(totales)} USDC.
    </p>
  );
}

function RetiroSimulado({ tasa, saldo }: { tasa: number; saldo: bigint | null }) {
  const [paso, setPaso] = useState<PasoRetiro>("monto");
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stroops, setStroops] = useState(0n);
  const [referencia, setReferencia] = useState("");

  function seguir(ev: FormEvent) {
    ev.preventDefault();
    try {
      const siguiente = stroopsDeLinea({ moneda: "usdc", monto: texto }, tasa);
      setStroops(siguiente);
      setError(null);
      setPaso("confirmar");
    } catch {
      setError("Escribí el USDC con hasta 7 decimales. Por ejemplo: 12.5");
    }
  }

  return (
    <section className="tarjeta" aria-labelledby="retiro-titulo">
      <p className="sello-simulado">Simulado: no mueve dinero real</p>
      <h2 id="retiro-titulo">Retiro a colones</h2>
      <ol className="pasos-mini">
        <li aria-current={paso === "monto" ? "step" : undefined}>1. Monto</li>
        <li aria-current={paso === "confirmar" ? "step" : undefined}>2. Confirmar</li>
        <li aria-current={paso === "listo" ? "step" : undefined}>3. Listo</li>
      </ol>
      {paso === "monto" ? (
        <form onSubmit={seguir}>
          <label className="campo" htmlFor="monto-retiro">
            ¿Cuánto USDC querés ver en colones?
            <input
              id="monto-retiro"
              inputMode="decimal"
              autoComplete="off"
              placeholder="12.5"
              value={texto}
              aria-invalid={error ? true : undefined}
              onChange={(ev) => {
                setTexto(ev.target.value);
                setError(null);
              }}
            />
          </label>
          <p className="suave">Es un ejemplo con {textoTipoCambio(tasa)}. No se llama a ningún servicio de retiro.</p>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="boton" type="submit" disabled={texto.trim() === ""}>
            Revisar simulación
          </button>
        </form>
      ) : null}
      {paso === "confirmar" ? (
        <>
          <p>
            {usdcVisible(stroops)} USDC se verían como {textoColones(colonesDeStroops(stroops, tasa))}.
          </p>
          {saldo === null ? (
            <p className="suave">No hay una cuenta conectada. La simulación sigue igual.</p>
          ) : stroops > saldo ? (
            <p className="aviso">Tu USDC de testnet no alcanza para este monto. Como es simulado, igual podés ver el recibo.</p>
          ) : (
            <p className="suave">Tu saldo de testnet sí cubre este monto. Igual no vamos a moverlo.</p>
          )}
          <div className="acciones">
            <button
              type="button"
              className="boton"
              onClick={() => {
                setReferencia(referenciaSimulada());
                setPaso("listo");
              }}
            >
              Confirmar simulación
            </button>
            <button type="button" className="boton boton--secundario" onClick={() => setPaso("monto")}>
              Volver
            </button>
          </div>
        </>
      ) : null}
      {paso === "listo" ? (
        <div className="recibo" role="status">
          <p className="sello-simulado">Simulado: no mueve dinero real</p>
          <h2>Listo</h2>
          <p>
            Referencia <strong>{referencia}</strong>
          </p>
          <p>
            {usdcVisible(stroops)} USDC quedarían en {textoColones(colonesDeStroops(stroops, tasa))}. No salió plata de tu
            cuenta ni de un banco. Esta referencia no existe en Stellar.
          </p>
          <button
            type="button"
            className="boton boton--secundario"
            onClick={() => {
              setPaso("monto");
              setTexto("");
              setReferencia("");
            }}
          >
            Hacer otra simulación
          </button>
        </div>
      ) : null}
    </section>
  );
}
