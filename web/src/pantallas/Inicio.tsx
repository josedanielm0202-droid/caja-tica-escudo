import { Link, useSearchParams } from "react-router-dom";
import { useBilletera } from "../billetera/useBilletera";
import { useTitulo } from "../lib/titulo";

const PASOS = [
  {
    titulo: "Depositá BTC en una bóveda Writz de 2 llaves",
    texto: "Una llave es tuya y la otra es del protocolo. Nadie se lleva el Bitcoin por su cuenta.",
  },
  {
    titulo: "Stellar verifica el depósito",
    texto: "Con la confirmación en Signet, la bóveda queda registrada en la red de prueba.",
  },
  {
    titulo: "Pedí USDC dentro del límite recomendado",
    texto: "El contrato pide una salud de 150 % o más. Ese colchón es el tope, no una promesa sobre el precio.",
  },
  {
    titulo: "Pasá ese USDC a colones",
    texto: "Sirve para pensar la planilla. En este demo el retiro es simulado: no sale plata de verdad.",
  },
  {
    titulo: "El Escudo vigila la salud del préstamo",
    texto: "Avisa por Telegram y puede hacer un abono automático desde una reserva en USDC.",
  },
  {
    titulo: "Pagá cuando querás y recuperá el BTC",
    texto: "Cualquier cuenta puede abonar. Al saldar la deuda, el Bitcoin vuelve a estar libre.",
  },
];

export function Inicio() {
  useTitulo("Inicio");
  const billetera = useBilletera();
  const [params] = useSearchParams();
  const search = params.toString();
  const ocupado = billetera.fase === "revisando" || billetera.fase === "conectando";
  return (
    <div className="pagina">
      <p className="kicker">Préstamo con garantía · Stellar testnet</p>
      <h1>Usá tu Bitcoin sin tener que soltarlo.</h1>
      <p className="lead">
        Si tenés BTC y ocupás pagar planilla, lo dejás en una bóveda y pedís USDC. No hace falta venderlo.
      </p>
      <div className="acciones">
        {billetera.conectada ? null : (
          <button
            type="button"
            className="boton"
            onClick={() => void billetera.conectar()}
            disabled={ocupado}
            aria-busy={ocupado || undefined}
          >
            {billetera.fase === "conectando" ? "Conectando…" : "Conectar billetera"}
          </button>
        )}
        <Link className={billetera.conectada ? "boton" : "boton boton--secundario"} to={{ pathname: "/panel", search }}>
          Mirá el panel
        </Link>
        <Link className="boton boton--secundario" to={{ pathname: "/prestamo", search }}>
          Ver el límite
        </Link>
      </div>
      <section className="bloque" aria-labelledby="como">
        <h2 id="como">Cómo funciona</h2>
        <ol className="pasos">
          {PASOS.map((paso, i) => (
            <li key={paso.titulo} className="paso">
              <span className="paso__num">{i + 1}</span>
              <div>
                <h3>{paso.titulo}</h3>
                <p>{paso.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <aside className="nota">
        Si el Bitcoin baja mucho, la salud del préstamo baja con él. Esto no promete que el precio se
        mantenga ni que vaya a subir.
      </aside>
    </div>
  );
}
