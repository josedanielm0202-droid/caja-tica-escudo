import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Marco } from "./componentes/Marco";
import { Historial } from "./pantallas/Historial";
import { Inicio } from "./pantallas/Inicio";
import { Panel } from "./pantallas/Panel";
import { PedirPrestamo } from "./pantallas/PedirPrestamo";
import { Planilla } from "./pantallas/Planilla";

function basename(): string | undefined {
  const base = import.meta.env.BASE_URL;
  if (base === "/") return undefined;
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export function App() {
  return (
    <BrowserRouter basename={basename()}>
      <Routes>
        <Route element={<Marco />}>
          <Route index element={<Inicio />} />
          <Route path="panel" element={<Panel />} />
          <Route path="prestamo" element={<PedirPrestamo />} />
          <Route path="planilla" element={<Planilla />} />
          <Route path="historial" element={<Historial />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
