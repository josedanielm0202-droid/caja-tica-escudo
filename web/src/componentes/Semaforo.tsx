import { useId } from "react";
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

const RADIO = 80;
/** Largo del semicírculo. 138 % cae cerca de 96, como en la maqueta. */
const LARGO = Math.PI * RADIO;

/** La aguja recorre de 100 % (izquierda) a 200 % (derecha). Arriba de 200 % se queda al final. */
function aguja(saludBp: number | null): { avance: number; x: number; y: number } {
  const t = saludBp === null ? 1 : Math.min(1, Math.max(0, (saludBp - 10_000) / 10_000));
  const angulo = Math.PI * (1 - t);
  return {
    avance: Math.max(t * LARGO, 1.5),
    x: 100 + RADIO * Math.cos(angulo),
    y: 100 - RADIO * Math.sin(angulo),
  };
}

export function Semaforo({ saludBp }: { saludBp: number | null }) {
  const color = semaforo(saludBp);
  const riesgo = enRiesgoDeLiquidacion(saludBp);
  const frase = saludBp === null ? "No hay deuda" : riesgo ? "Riesgo de liquidación" : FRASE[color];
  const etiqueta =
    saludBp === null
      ? "Semáforo en verde. No hay deuda. La aguja va de 100 % a 200 %."
      : `Semáforo en ${NOMBRE[color].toLowerCase()}. Salud ${textoSalud(saludBp)}. ${frase}. La aguja va de 100 % a 200 %.`;
  const marca = aguja(saludBp);
  const gradiente = `zonas${useId().replace(/:/g, "")}`;

  return (
    <figure className={`semaforo semaforo--${color} vidrio`} aria-label={etiqueta}>
      <div className="semaforo__cuerpo">
        <svg className="semaforo__arco" viewBox="0 0 200 118" aria-hidden="true">
          <defs>
            <linearGradient id={gradiente} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e15d55" />
              <stop offset="25%" stopColor="#e15d55" />
              <stop offset="25%" stopColor="#f0b429" />
              <stop offset="50%" stopColor="#f0b429" />
              <stop offset="50%" stopColor="#3dbe7a" />
              <stop offset="100%" stopColor="#3dbe7a" />
            </linearGradient>
          </defs>
          <path
            d="M20 100 A80 80 0 0 1 180 100"
            fill="none"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M20 100 A80 80 0 0 1 180 100"
            fill="none"
            stroke={`url(#${gradiente})`}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${marca.avance} ${LARGO}`}
          />
          <circle cx={marca.x} cy={marca.y} r="6.5" fill="#fff8ea" stroke="#f0b429" strokeWidth="3" />
        </svg>
        <figcaption>
          <p className="semaforo__pct">{textoSalud(saludBp)}</p>
          <p className="semaforo__nombre">{NOMBRE[color]}</p>
          <p className="semaforo__frase">{frase}</p>
        </figcaption>
      </div>
      <p className="semaforo__escala">La aguja va de 100 % a 200 %.</p>
      <ul className="semaforo__leyenda">
        <li>Verde: 150 % o más, o sin deuda</li>
        <li>Amarillo: de 125 % a menos de 150 %</li>
        <li>Rojo: menos de 125 %. Bajo 120 % se puede liquidar parte de la garantía</li>
      </ul>
    </figure>
  );
}
