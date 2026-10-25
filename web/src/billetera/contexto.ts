import { createContext } from "react";
import type { EstadoBilletera } from "./BilleteraContext";

export const BilleteraCtx = createContext<EstadoBilletera | null>(null);
