import { useState, type FormEvent } from "react";
import { expertAccount } from "../../../writz/config";
import type { Prestamo } from "../../../writz/client";
import { precioLiquidacion } from "../../../writz/units";
import { acortarClave } from "../billetera/firmante";
import { AvisoEscudo } from "../componentes/AvisoEscudo";
import { Semaforo } from "../componentes/Semaforo";
import { COLATERAL, ESCENARIOS, PRECIO_BTC_EJEMPLO, SATS_EJEMPLO, type IdEscenario, cifras } from "../datos/ejemplo";
import { etiquetaEstado, textoBtc, textoLtv, textoSalud, textoSats, textoUsd, textoUsdc } from "../lib/formato";
import { useLecturaPrestamo, type LecturaPrestamo } from "../lib/useLecturaPrestamo";
import { useTxidActivo, type FuenteTxid } from "../lib/useTxidActivo";
import { useTitulo } from "../lib/titulo";

export function Panel() {
  useTitulo("Panel");
  const { crudo, fuente, fijar, verEjemplo } = useTxidActivo();
  const lectura = useLecturaPrestamo(crudo);
  const [borrador, setBorrador] = useState<{ base: string; texto: string } | null>(null);
  const texto = borrador?.base === crudo ? borrador.texto : crudo;

  function enviar(ev: FormEvent) {
    ev.preventDefault();
    fijar(texto);
    setBorrador(null);
  }

  return (
    <div className="pagina">
      <h1>Panel</h1>
      <form className="tarjeta" onSubmit={enviar}>
        <label className="campo" htmlFor="txid">
          Txid del préstamo
          <input
            id="txid"
            className="txid-input"
            value={texto}
            onChange={(ev) => setBorrador({ base: crudo, texto: ev.target.value })}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="64 hex, orden interno"
            aria-invalid={lectura.tipo === "invalido" || undefined}
          />
        </label>
        <div className="acciones">
          <button type="submit" className="boton">
            Ver este préstamo
          </button>
          {fuente === "query" || fuente === "env" ? (
            <button type="button" className="boton boton--secundario" onClick={verEjemplo}>
              Ver datos de ejemplo
            </button>
          ) : null}
          {lectura.tipo === "listo" || lectura.tipo === "error" || lectura.tipo === "vacio" ? (
            <button type="button" className="boton boton--secundario" onClick={lectura.releer}>
              Volver a leer
            </button>
          ) : null}
        </div>
        <p className="suave">{textoFuente(fuente)}</p>
      </form>
      {lectura.tipo === "sin-txid" ? <PanelEjemplo /> : null}
      {lectura.tipo === "invalido" ? (
        <p className="error" role="alert">
          Ese txid no sirve. Tienen que ser 64 caracteres hexadecimales, el orden interno del contrato
          (el mismo que <code>LOAN_TXID</code>).
        </p>
      ) : null}
      {lectura.tipo === "cargando" ? (
        <p role="status">Leyendo el préstamo en testnet…</p>
      ) : null}
      {lectura.tipo === "vacio" ? (
        <p className="error" role="alert">
          No encontré un préstamo con ese txid. Revisá el orden interno: no es el que muestra el
          explorador de Bitcoin.
        </p>
      ) : null}
      {lectura.tipo === "error" ? (
        <p className="error" role="alert">
          No pude leer la red de prueba: {lectura.mensaje}
        </p>
      ) : null}
      {lectura.tipo === "listo" ? <PanelReal lectura={lectura} /> : null}
    </div>
  );
}

function textoFuente(fuente: FuenteTxid): string {
  if (fuente === "query") return "Estás viendo el txid de la dirección (?txid=). Se vuelve a leer cada 30 segundos.";
  if (fuente === "env") {
    return "Estás viendo VITE_TXID_DEMO, el mismo dato que LOAN_TXID en los scripts. Podés cambiarlo acá o con ?txid=.";
  }
  if (fuente === "ejemplo") return "Elegiste los datos de ejemplo, aunque haya un txid guardado.";
  return "Sin txid no llamo a la red. Abajo están los datos de ejemplo.";
}

function PanelReal({ lectura }: { lectura: Extract<LecturaPrestamo, { tipo: "listo" }> }) {
  const prestamo = lectura.prestamo;
  const sats = BigInt(prestamo.btcSats);
  const deuda = BigInt(prestamo.deudaStroops);
  const liquidacion = precioLiquidacion(sats, deuda);

  return (
    <>
      {lectura.actualizando ? <p className="suave">Actualizando…</p> : null}
      {lectura.errorRefresco ? (
        <p className="error" role="alert">
          No pude actualizar: {lectura.errorRefresco}. Sigo mostrando la última lectura.
        </p>
      ) : null}
      <p className="kicker">Préstamo en testnet</p>
      {prestamo.enRiesgo ? <AvisoEscudo /> : null}
      {prestamo.saludBp !== null && prestamo.saludBp > 20_000 ? (
        <p className="suave">
          La salud pasa de 200 %. La aguja se queda al final del arco; el porcentaje es el del contrato.
        </p>
      ) : null}
      <div className="panel-rejilla">
        <Semaforo saludBp={prestamo.saludBp} />
        <dl className="datos">
          <div>
            <dt>BTC guardado</dt>
            <dd>
              {textoBtc(sats)}
              <span className="dato-extra">{textoSats(sats)}</span>
            </dd>
          </div>
          <div>
            <dt>Deuda</dt>
            <dd>{textoUsdc(deuda)}</dd>
          </div>
          <div>
            <dt>Salud</dt>
            <dd>{textoSalud(prestamo.saludBp)}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>{etiquetaEstado(prestamo.estado)}</dd>
          </div>
          <div>
            <dt>Precio de liquidación</dt>
            <dd>{deuda === 0n ? "Sin deuda" : textoUsd(liquidacion)}</dd>
          </div>
          <div>
            <dt>Dueño</dt>
            <dd>{acortarClave(prestamo.dueno)}</dd>
          </div>
        </dl>
      </div>
      <p>
        <a href={expertAccount(prestamo.dueno)} target="_blank" rel="noreferrer">
          Ver la cuenta en Stellar Expert
        </a>
      </p>
      <p className="mono suave">{prestamo.txid}</p>
      <p className="suave">
        El enlace es la cuenta que depositó, en Stellar testnet. El txid es el id del préstamo en la
        bóveda (orden interno), no una transacción de Stellar.{" "}
        {prestamo.estado === "Active" ? <NotaActivo prestamo={prestamo} /> : null}
      </p>
    </>
  );
}

function NotaActivo({ prestamo }: { prestamo: Prestamo }) {
  if (prestamo.saludBp === null) return <>No hay deuda, así que el semáforo queda en verde.</>;
  return <>La salud sale del contrato, en basis points, y el color lo pone el semáforo de Writz.</>;
}

function PanelEjemplo() {
  const [id, setId] = useState<IdEscenario>("amarillo");
  const escenario = ESCENARIOS.find((item) => item.id === id) ?? ESCENARIOS[1]!;
  const datos = cifras(escenario);

  return (
    <>
      <p className="kicker">Datos de ejemplo</p>
      <p className="aviso">
        Datos de ejemplo, armados con las reglas de <code>writz/units.ts</code>. No son el préstamo de
        tu cuenta: el saldo USDC de arriba, si aparece, sí es el de la billetera.
      </p>
      <fieldset className="chips">
        <legend>Elegí un ejemplo</legend>
        {ESCENARIOS.map((item) => (
          <label key={item.id} className="chip">
            <input
              type="radio"
              name="escenario"
              value={item.id}
              checked={item.id === id}
              onChange={() => setId(item.id)}
            />
            {item.nombre}
          </label>
        ))}
      </fieldset>
      <p className="suave">{escenario.explicacion}</p>
      {datos.enRiesgo ? <AvisoEscudo /> : null}
      <div className="panel-rejilla">
        <Semaforo saludBp={datos.saludBp} />
        <dl className="datos">
          <div>
            <dt>BTC guardado</dt>
            <dd>
              {textoBtc(SATS_EJEMPLO)}
              <span className="dato-extra">{textoSats(SATS_EJEMPLO)}</span>
            </dd>
          </div>
          <div>
            <dt>Deuda USDC</dt>
            <dd>{textoUsdc(escenario.deudaStroops)}</dd>
          </div>
          <div>
            <dt>Cuánto podés pedir</dt>
            <dd>{textoUsdc(datos.disponible)}</dd>
          </div>
          <div>
            <dt>Salud</dt>
            <dd>{textoSalud(datos.saludBp)}</dd>
          </div>
          <div>
            <dt>LTV</dt>
            <dd>{textoLtv(datos.ltv)}</dd>
          </div>
          <div>
            <dt>Precio aproximado de liquidación</dt>
            <dd>{textoUsd(datos.liquidacion)}</dd>
          </div>
          <div>
            <dt>Valor del colateral</dt>
            <dd>{textoUsdc(COLATERAL)}</dd>
          </div>
          <div>
            <dt>Precio de ejemplo del BTC</dt>
            <dd>{textoUsd(PRECIO_BTC_EJEMPLO)}</dd>
          </div>
        </dl>
      </div>
      <p className="suave">
        El precio de ejemplo es de muestra, no es el del mercado y no es una proyección. El tope para
        pedir prestado deja la salud en 150 % o más. Bajo 120 % se puede perder parte de la garantía.
      </p>
    </>
  );
}
