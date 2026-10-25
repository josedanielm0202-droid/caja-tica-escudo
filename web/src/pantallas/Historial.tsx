import { WRITZ, expertContract } from "../../../writz/config";
import { useTitulo } from "../lib/titulo";

const EJEMPLOS = [
  {
    cuando: "24 oct 2026",
    tipo: "Depósito",
    titulo: "BTC en la bóveda",
    detalle: "Ejemplo · 0,02 BTC. Todavía no es un movimiento tuyo.",
  },
  {
    cuando: "24 oct 2026",
    tipo: "Préstamo",
    titulo: "USDC prestado",
    detalle: "Ejemplo · así se va a ver el préstamo cuando la billetera esté conectada.",
  },
  {
    cuando: "25 oct 2026",
    tipo: "Escudo",
    titulo: "Aviso de salud",
    detalle: "Ejemplo · no se mandó ningún mensaje a Telegram.",
  },
  {
    cuando: "25 oct 2026",
    tipo: "Simulado",
    titulo: "Retiro a colones",
    detalle: "Ejemplo · el retiro es simulado y no mueve plata.",
  },
];

export function Historial() {
  useTitulo("Historial");
  const enlace = expertContract(WRITZ.contracts.writzLend);
  return (
    <div className="pagina">
      <h1>Historial</h1>
      <p className="aviso">
        Todavía no hay movimientos de tu billetera. Cuando la conectés, cada transacción va a traer su
        enlace a Stellar Expert. Abajo hay ejemplos de cómo se va a ver.
      </p>
      <ul className="lista">
        {EJEMPLOS.map((item) => (
          <li key={item.titulo} className="tarjeta">
            <p className="kicker">
              {item.tipo} · {item.cuando} · Ejemplo
            </p>
            <h2>{item.titulo}</h2>
            <p>{item.detalle}</p>
          </li>
        ))}
      </ul>
      <p>
        <a href={enlace} target="_blank" rel="noreferrer">
          Ver el contrato writz-lend en Stellar Expert (testnet)
        </a>
      </p>
      <p className="mono suave">{WRITZ.contracts.writzLend}</p>
      <p className="suave">Ese enlace es la referencia del contrato, no una transacción tuya.</p>
    </div>
  );
}
