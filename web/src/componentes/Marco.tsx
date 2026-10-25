import { NavLink, Outlet } from "react-router-dom";
import { PieLegal } from "./PieLegal";

const ENLACES = [
  { to: "/", fin: true, label: "Inicio", icono: IconoInicio },
  { to: "/panel", fin: false, label: "Panel", icono: IconoPanel },
  { to: "/prestamo", fin: false, label: "Préstamo", icono: IconoPrestamo },
  { to: "/planilla", fin: false, label: "Planilla", icono: IconoPlanilla },
  { to: "/historial", fin: false, label: "Historial", icono: IconoHistorial },
] as const;

export function Marco() {
  return (
    <div className="cuerpo">
      <a className="saltar" href="#contenido">
        Saltar al contenido
      </a>
      <header className="barra">
        <NavLink to="/" className="marca" end>
          <Escudo />
          <span>
            <strong>Caja Tica</strong>
            <small>Escudo</small>
          </span>
        </NavLink>
        <nav className="nav-escritorio" aria-label="Principal">
          {ENLACES.map((enlace) => (
            <NavLink key={enlace.to} to={enlace.to} end={enlace.fin}>
              {enlace.label}
            </NavLink>
          ))}
        </nav>
        <span className="pastilla">Testnet</span>
      </header>
      <main id="contenido" className="contenido">
        <Outlet />
      </main>
      <PieLegal />
      <nav className="nav-movil" aria-label="Principal">
        {ENLACES.map((enlace) => (
          <NavLink key={enlace.to} to={enlace.to} end={enlace.fin}>
            <enlace.icono />
            <span>{enlace.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function Escudo() {
  return (
    <svg className="marca__svg" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 2 28 7v9c0 7.2-4.8 12-12 14C8.8 28 4 23.2 4 16V7l12-5z" fill="currentColor" />
    </svg>
  );
}

function IconoInicio() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5z" fill="currentColor" />
    </svg>
  );
}

function IconoPanel() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 12 16 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconoPrestamo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 9v6M9.5 12.5 12 15l2.5-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconoPlanilla() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M9 13h6M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconoHistorial() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v5l3 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
