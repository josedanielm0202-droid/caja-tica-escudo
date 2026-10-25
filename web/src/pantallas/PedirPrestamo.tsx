import { useState } from "react";
import { Link } from "react-router-dom";
import { MIN_BORROW_RATIO_BP } from "../../../writz/config";
import { pedirPrestamo, type ResultadoTx } from "../../../writz/client";
import { stroopsAUsdc } from "../../../writz/units";
import { useBilletera } from "../billetera/useBilletera";
import { AvisoEscudo } from "../componentes/AvisoEscudo";
import { Semaforo } from "../componentes/Semaforo";
import { COLATERAL, PRECIO_BTC_EJEMPLO, SATS_EJEMPLO } from "../datos/ejemplo";
import {
  colateralDesdeSalud,
  montoDentroDelTope,
  simularLtv,
  TOPE_LTV_BP,
  type SimulacionLtv,
} from "../lib/calculoPrestamo";
import { etiquetaEstado, textoBtc, textoLtv, textoSalud, textoUsd, textoUsdc } from "../lib/formato";
import { guardarMovimientoSesion } from "../lib/sesionMovimientos";
import { useLecturaPrestamo } from "../lib/useLecturaPrestamo";
import { useTxidActivo } from "../lib/useTxidActivo";
import { useTitulo } from "../lib/titulo";

function recordarPrestamo(respuesta: ResultadoTx) {
  guardarMovimientoSesion(localStorage, {
    hash: respuesta.hash,
    enlace: respuesta.enlace,
    tipo: "prestamo",
    titulo: "USDC pedido",
    cuando: Date.now(),
  });
}

export function PedirPrestamo() {
  useTitulo("Pedir préstamo");
  const billetera = useBilletera();
  const { crudo, busqueda } = useTxidActivo();
  const lectura = useLecturaPrestamo(crudo);
  const [ltv, setLtv] = useState(5_000);
  const [enviando, setEnviando] = useState(false);
  const [errorTx, setErrorTx] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoTx | null>(null);

  const real = lectura.tipo === "listo" ? lectura.prestamo : null;
  const deudaReal = real ? BigInt(real.deudaStroops) : 0n;
  const colateralReal = real ? colateralDesdeSalud(deudaReal, real.saludBp) : null;
  const usandoReal = colateralReal !== null && real?.estado === "Active";
  const colateral = colateralReal ?? COLATERAL;
  const deudaActual = usandoReal ? deudaReal : 0n;
  const sats = usandoReal && real ? BigInt(real.btcSats) : SATS_EJEMPLO;
  const simulacion = simularLtv({
    colateralStroops: colateral,
    deudaActual,
    sats,
    ltvDeseadoBp: ltv,
  });
  const razon = razonBloqueo({
    enviando,
    otraRed: Boolean(billetera.conectada && billetera.red && !billetera.red.esTestnet),
    hayFirmante: Boolean(billetera.firmante),
    lecturaTipo: lectura.tipo,
    estado: real?.estado ?? null,
    hayColateralReal: colateralReal !== null,
    usandoReal,
    simulacion,
  });
  const puede = razon === null && Boolean(billetera.firmante) && usandoReal && real !== null;

  async function pedir() {
    if (!puede || !billetera.firmante || !real) return;
    setEnviando(true);
    setErrorTx(null);
    setResultado(null);
    try {
      // pedirPrestamo convierte el USDC legible a stroops adentro. Pasar el bigint
      // lo volvería a convertir y pediría un monto enorme.
      const monto = stroopsAUsdc(simulacion.montoStroops);
      const respuesta = await pedirPrestamo(monto, real.txid, billetera.firmante);
      setResultado(respuesta);
      recordarPrestamo(respuesta);
      lectura.releer();
    } catch (causa) {
      const texto = causa instanceof Error ? causa.message : "No se pudo pedir el préstamo.";
      setErrorTx(texto.length > 220 ? `${texto.slice(0, 217)}…` : texto);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pagina">
      <h1>Pedir préstamo</h1>
      {usandoReal && real ? (
        <p>
          Préstamo en testnet, {textoBtc(sats)} en garantía y {textoUsdc(deudaReal)} de deuda. El control
          no pasa de {textoLtv(TOPE_LTV_BP)}.
        </p>
      ) : (
        <>
          <p className="kicker">Datos de ejemplo</p>
          <p>
            Mové el control para ver cómo queda la salud con {textoBtc(SATS_EJEMPLO)} a{" "}
            {textoUsd(PRECIO_BTC_EJEMPLO)} por BTC. Con datos de ejemplo no se envía ninguna transacción.
          </p>
        </>
      )}
      {real?.enRiesgo ? <AvisoEscudo /> : null}
      <div className="tarjeta">
        <label className="campo" htmlFor="ltv">
          {usandoReal ? "LTV" : "LTV de ejemplo"}: {textoLtv(simulacion.ltvResultanteBp)}
        </label>
        <input
          id="ltv"
          type="range"
          min={0}
          max={TOPE_LTV_BP}
          step={1}
          value={Math.min(TOPE_LTV_BP, Math.max(0, ltv))}
          onChange={(ev) => setLtv(Math.min(TOPE_LTV_BP, Math.max(0, Number(ev.target.value))))}
          aria-describedby="ayuda-ltv"
        />
        <p className="suave" id="ayuda-ltv">
          El tope es {textoLtv(TOPE_LTV_BP)} (salud de {textoLtv(MIN_BORROW_RATIO_BP)} o más). Máximo que
          podés pedir hoy: {textoUsdc(simulacion.topeStroops)}.
        </p>
        {simulacion.sobreLimite ? (
          <p className="error" role="status">
            Ese monto pasa el máximo. El contrato no deja una salud bajo {textoLtv(MIN_BORROW_RATIO_BP)}.
          </p>
        ) : simulacion.montoStroops === 0n ? (
          <p className="suave" role="status">
            Con este LTV no pedís USDC nuevo.
          </p>
        ) : (
          <p className="ok" role="status">
            Con esta deuda la salud queda en el límite recomendado o por encima.
          </p>
        )}
      </div>
      <Semaforo saludBp={simulacion.saludBp} />
      <dl className="datos">
        <div>
          <dt>{usandoReal ? "USDC a pedir" : "USDC de esta simulación"}</dt>
          <dd>{textoUsdc(simulacion.montoStroops)}</dd>
        </div>
        <div>
          <dt>Deuda después</dt>
          <dd>{textoUsdc(simulacion.deudaResultante)}</dd>
        </div>
        <div>
          <dt>Precio de liquidación</dt>
          <dd>{simulacion.liquidacion === 0n ? "Sin deuda" : textoUsd(simulacion.liquidacion)}</dd>
        </div>
        <div>
          <dt>Salud después</dt>
          <dd>{textoSalud(simulacion.saludBp)}</dd>
        </div>
      </dl>
      <aside className="nota">
        <strong>Antes de pedir.</strong> Esto no es una inversión. Si el Bitcoin baja, podés perder parte
        de la garantía. Writz no está auditado. Es Stellar testnet: no conectés una cuenta con plata de
        la red pública.
      </aside>
      {razon ? <p className="aviso">{razon}</p> : null}
      {errorTx ? (
        <p className="error" role="alert">
          {errorTx}
        </p>
      ) : null}
      {resultado ? (
        <div className="recibo" role="status">
          <p>Listo. Freighter firmó el pedido.</p>
          <p className="mono">{resultado.hash}</p>
          <p>
            <a href={resultado.enlace} target="_blank" rel="noreferrer">
              Ver en Stellar Expert
            </a>
          </p>
        </div>
      ) : null}
      <div className="acciones">
        <button type="button" className="boton" disabled={!puede || enviando} onClick={() => void pedir()}>
          {enviando ? "Esperando la firma…" : `Pedir ${textoUsdc(simulacion.montoStroops)}`}
        </button>
        {billetera.firmante ? null : (
          <button
            type="button"
            className="boton boton--secundario"
            onClick={() => void billetera.conectar()}
            disabled={billetera.fase === "revisando" || billetera.fase === "conectando"}
          >
            {billetera.fase === "conectando" ? "Conectando…" : "Conectar billetera"}
          </button>
        )}
        <Link className="boton boton--secundario" to={{ pathname: "/panel", search: busqueda }}>
          Ir al panel
        </Link>
      </div>
    </div>
  );
}

function razonBloqueo(opciones: {
  enviando: boolean;
  otraRed: boolean;
  hayFirmante: boolean;
  lecturaTipo: string;
  estado: "Active" | "Closed" | "Liquidated" | null;
  hayColateralReal: boolean;
  usandoReal: boolean;
  simulacion: SimulacionLtv;
}): string | null {
  if (opciones.enviando) return null;
  if (!opciones.hayFirmante) {
    if (opciones.otraRed) return "Freighter está en otra red. Pasalo a testnet: sin eso no hay firmante.";
    if (opciones.lecturaTipo === "sin-txid") {
      return "Conectá Freighter en testnet y cargá el txid del préstamo en el Panel. Con datos de ejemplo no se pide nada.";
    }
    return "Conectá Freighter en testnet para poder firmar. Mientras tanto el botón queda apagado.";
  }
  if (opciones.lecturaTipo === "sin-txid") {
    return "Falta el txid del préstamo. Ponelo en el Panel o en la dirección (?txid=). Con datos de ejemplo no se pide nada.";
  }
  if (opciones.lecturaTipo === "cargando") return "Estoy leyendo el préstamo. Esperá un momento.";
  if (opciones.lecturaTipo === "invalido") return "El txid no es válido. Corregilo en el Panel.";
  if (opciones.lecturaTipo === "vacio") return "No encontré ese préstamo en testnet.";
  if (opciones.lecturaTipo === "error") return "No pude leer el préstamo, así que no voy a pedir.";
  if (opciones.estado && opciones.estado !== "Active") {
    return `Este préstamo está ${etiquetaEstado(opciones.estado)}. No se puede pedir más.`;
  }
  if (!opciones.hayColateralReal) {
    return "Este préstamo no tiene deuda, y sin el precio del oráculo no puedo calcular el máximo real. El control de arriba es de ejemplo y no envía la transacción.";
  }
  if (!opciones.usandoReal) return "Todavía no hay un préstamo activo para pedir.";
  if (opciones.simulacion.topeStroops === 0n) {
    return "Ya estás en el tope de 66 % de LTV o lo pasaste. Aboná antes de pedir más.";
  }
  if (!montoDentroDelTope(opciones.simulacion)) {
    return "Con este LTV no hay un monto válido dentro del máximo. Subí el control, sin pasar de 66 %.";
  }
  return null;
}
