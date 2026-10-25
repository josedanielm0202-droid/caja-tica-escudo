/** Manchas del degradado. Sin backdrop-filter: en un teléfono medio eso se traba. */
export function Fondo() {
  return (
    <div className="fondo" aria-hidden="true">
      <div className="blob" />
      <div className="blob blob--chico" />
    </div>
  );
}
