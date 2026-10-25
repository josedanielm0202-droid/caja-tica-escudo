import { enRiesgoDeLiquidacion, semaforo, type Semaforo as Color } from "../../../writz/units";
import { textoSalud } from "../lib/formato";

const FRASE: Record<Color, string> = {
  verde: "Dentro del límite",
  amarillo: "Conviene abonar",
  rojo: "Por debajo de 125 %",
};

const NOMBRE: Record<Color, string> = {
  verde: "Verde",
  amarillo: "Amarillo",
  rojo: "Rojo",
};

export function Semaforo({ saludBp }: { saludBp: number | null }) {
  const color = semaforo(saludBp);
  const riesgo = enRiesgoDeLiquidacion(saludBp);
  const frase = saludBp === null ? "No hay deuda" : riesgo ? "Riesgo de liquidación" : FRASE[color];
  const etiqueta =
    saludBp === null
      ? "Semáforo en verde. No hay deuda."
      : `Semáforo en ${NOMBRE[color].toLowerCase()}. Salud ${textoSalud(saludBp)}. ${frase}.`;

  return (
    <figure className={`semaforo semaforo--${color}`} aria-label={etiqueta}>
      <div className="semaforo__lamparas" aria-hidden="true">
        <span className={color === "rojo" ? "lampara lampara--roja encendida" : "lampara"} />
        <span className={color === "amarillo" ? "lampara lampara--amarilla encendida" : "lampara"} />
        <span className={color === "verde" ? "lampara lampara--verde encendida" : "lampara"} />
      </div>
      <figcaption>
        <p className="semaforo__nombre">{NOMBRE[color]}</p>
        <p className="semaforo__pct">{textoSalud(saludBp)}</p>
        <p className="semaforo__frase">{frase}</p>
      </figcaption>
      <ul className="semaforo__leyenda">
        <li>Verde: 150 % o más, o sin deuda</li>
        <li>Amarillo: de 125 % a menos de 150 %</li>
        <li>Rojo: menos de 125 %. Bajo 120 % se puede liquidar parte de la garantía</li>
      </ul>
    </figure>
  );
}
