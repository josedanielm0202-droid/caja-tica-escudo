/** Aviso del Escudo cuando `enRiesgo` (salud bajo 120 %). */
export function AvisoEscudo() {
  return (
    <p className="aviso aviso--riesgo" role="status">
      <strong>Escudo.</strong> Este préstamo está en riesgo: la salud está bajo 120 %. Se puede liquidar
      parte de la garantía. El Escudo puede avisar por Telegram y abonar USDC desde la reserva.
    </p>
  );
}
