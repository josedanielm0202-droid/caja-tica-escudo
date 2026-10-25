import markdown from "../../../docs/transacciones.md?raw";
import { cuentaDemo, parsearTransaccionesDemo } from "../lib/parsearTransacciones";

export const MOVIMIENTOS_DEMO = parsearTransaccionesDemo(markdown);
export const CUENTA_DEMO = cuentaDemo(markdown);
