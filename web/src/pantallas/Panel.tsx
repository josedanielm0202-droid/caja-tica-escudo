import { useState } from "react";
import { Semaforo } from "../componentes/Semaforo";
import {
  COLATERAL,
  ESCENARIOS,
  PRECIO_BTC_EJEMPLO,
  SATS_EJEMPLO,
  type IdEscenario,
  cifras,
} from "../datos/ejemplo";
import { textoBtc, textoLtv, textoSalud, textoUsd, textoUsdc } from "../lib/formato";
import { useTitulo } from "../lib/titulo";

export function Panel() {
  useTitulo("Panel");
  const [id, setId] = useState<IdEscenario>("amarillo");
  const escenario = ESCENARIOS.find((item) => item.id === id) ?? ESCENARIOS[1]!;
  const datos = cifras(escenario);

  return (
    <div className="pagina">
      <h1>Panel</h1>
      <p className="aviso">
        Datos de ejemplo, armados con las reglas de <code>writz/units.ts</code>. Todavía no están
        conectados a tu billetera ni a la red de prueba.
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
      <Semaforo saludBp={datos.saludBp} />
      <dl className="datos">
        <div>
          <dt>BTC guardado</dt>
          <dd>{textoBtc(SATS_EJEMPLO)}</dd>
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
      <p className="suave">
        El precio de ejemplo es de muestra, no es el del mercado y no es una proyección. El tope para
        pedir prestado deja la salud en 150 % o más. Bajo 120 % se puede perder parte de la garantía.
      </p>
    </div>
  );
}
