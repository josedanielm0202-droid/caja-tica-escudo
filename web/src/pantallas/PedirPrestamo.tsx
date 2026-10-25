import { useState } from "react";
import { Semaforo } from "../componentes/Semaforo";
import { BP } from "../../../writz/config";
import { ltvBp, maximoPrestable, precioLiquidacion } from "../../../writz/units";
import {
  COLATERAL,
  PRECIO_BTC_EJEMPLO,
  SATS_EJEMPLO,
  TOPE_LTV_BP,
  deudaDesdeLtv,
  saludDesdeDeuda,
} from "../datos/ejemplo";
import { useBilletera } from "../billetera/useBilletera";
import { textoBtc, textoLtv, textoUsd, textoUsdc } from "../lib/formato";
import { useTitulo } from "../lib/titulo";

export function PedirPrestamo() {
  useTitulo("Pedir préstamo");
  const [ltv, setLtv] = useState(5_000);
  const deuda = deudaDesdeLtv(ltv);
  const salud = saludDesdeDeuda(deuda);
  const ltvReal = ltvBp(COLATERAL, deuda);
  const tope = maximoPrestable(COLATERAL, 0n);
  const sobreLimite = ltvReal > TOPE_LTV_BP;
  const billetera = useBilletera();

  return (
    <div className="pagina">
      <h1>Pedir préstamo</h1>
      <p>
        Mové el control para ver cómo queda la salud con un colateral de ejemplo de {textoBtc(SATS_EJEMPLO)} a{" "}
        {textoUsd(PRECIO_BTC_EJEMPLO)} por BTC. No se envía ninguna transacción.
      </p>
      <div className="tarjeta">
        <label className="campo" htmlFor="ltv">
          LTV de ejemplo: {textoLtv(ltvReal)}
        </label>
        <input
          id="ltv"
          type="range"
          min={2_000}
          max={8_500}
          step={50}
          value={ltv}
          onChange={(ev) => setLtv(Number(ev.target.value))}
        />
        <p className="suave" id="ayuda-ltv">
          El límite recomendado es {textoLtv(TOPE_LTV_BP)} (salud de {textoLtv(15_000)} o más). Máximo
          recomendado hoy: {textoUsdc(tope)}.
        </p>
        {sobreLimite ? (
          <p className="error" role="status">
            Pasaste el límite recomendado. En la red de prueba el contrato no deja pedir tanto: exige que
            la salud quede en 150 % o más. Este control es solo para ver qué pasa si el BTC baja después.
          </p>
        ) : (
          <p className="ok" role="status">
            Con esta deuda la salud sigue en el límite recomendado o por encima.
          </p>
        )}
      </div>
      <Semaforo saludBp={salud} />
      <dl className="datos">
        <div>
          <dt>USDC de esta simulación</dt>
          <dd>{textoUsdc(deuda)}</dd>
        </div>
        <div>
          <dt>Precio aproximado de liquidación</dt>
          <dd>{textoUsd(precioLiquidacion(SATS_EJEMPLO, deuda))}</dd>
        </div>
        <div>
          <dt>Salud resultante</dt>
          <dd>{salud === null ? "Sin deuda" : `${(salud / 100).toLocaleString("es-CR", { maximumFractionDigits: 1 })} %`}</dd>
        </div>
        <div>
          <dt>Referencia</dt>
          <dd>{(BP / 100).toLocaleString("es-CR")} % = salud igual al colateral</dd>
        </div>
      </dl>
      {billetera.firmante ? (
        <button type="button" className="boton" disabled>
          Pedir prestado queda para cuando haya un depósito
        </button>
      ) : billetera.conectada ? null : (
        <button
          type="button"
          className="boton"
          onClick={() => void billetera.conectar()}
          disabled={billetera.fase === "revisando" || billetera.fase === "conectando"}
        >
          {billetera.fase === "conectando" ? "Conectando…" : "Conectar billetera"}
        </button>
      )}
    </div>
  );
}
