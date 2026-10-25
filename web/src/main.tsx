import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { chequearWritzEnNavegador } from "./lib/clienteNavegador";
import { FalloArranque } from "./pantallas/FalloArranque";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("No está el contenedor de la app.");

try {
  chequearWritzEnNavegador();
  document.documentElement.dataset.writzCliente = "listo";
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (error) {
  const mensaje = error instanceof Error ? error.message : "No se pudo cargar el módulo Writz.";
  createRoot(root).render(<FalloArranque mensaje={mensaje} />);
}
