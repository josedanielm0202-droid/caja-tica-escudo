import { Fondo } from "../componentes/Fondo";
import { PieLegal } from "../componentes/PieLegal";

export function FalloArranque({ mensaje }: { mensaje: string }) {
  return (
    <div className="cuerpo">
      <Fondo />
      <main className="contenido">
        <h1>No se pudo abrir Caja Tica</h1>
        <p className="error" role="alert">
          {mensaje}
        </p>
        <p>El módulo compartido de Writz tiene que cargar en el navegador antes de mostrar las pantallas.</p>
      </main>
      <PieLegal />
    </div>
  );
}
