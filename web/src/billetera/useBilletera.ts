import { useContext } from "react";
import type { EstadoBilletera } from "./BilleteraContext";
import { BilleteraCtx } from "./contexto";

export function useBilletera(): EstadoBilletera {
  const ctx = useContext(BilleteraCtx);
  if (!ctx) throw new Error("useBilletera tiene que usarse dentro de BilleteraProvider.");
  return ctx;
}
