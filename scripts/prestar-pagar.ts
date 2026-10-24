// Uso: npm run prestar-pagar -- <montoPrestamo> <montoAbono>
// 1) demo pide prestado  2) demo pasa el abono a la reserva  3) la reserva abona (como el Escudo).
import "dotenv/config";
import { Address, nativeToScVal } from "@stellar/stellar-sdk";
import { enviar, leerPrestamo, pagar, pedirPrestamo } from "../writz/client.js";
import { WRITZ } from "../writz/config.js";
import { usdcAStroops } from "../writz/units.js";
const [m1 = "1", m2 = "0.5"] = process.argv.slice(2);
const e = process.env as Record<string, string>;
const txid = e.LOAN_TXID; if (!txid) throw new Error("Falta LOAN_TXID en .env");
console.log("antes:", await leerPrestamo(txid));
console.log("borrow (demo):", (await pedirPrestamo(m1, txid, { secret: e.DEMO_SECRET })).enlace);
console.log("transfer demo->reserva:", (await enviar({ secret: e.DEMO_SECRET }, "transfer", [
  new Address(e.DEMO_PUBLIC).toScVal(), new Address(e.RESERVA_PUBLIC).toScVal(), nativeToScVal(usdcAStroops(m2), { type: "i128" })], undefined, WRITZ.contracts.usdc)).enlace);
console.log("despues borrow:", await leerPrestamo(txid));
console.log("repay (reserva, Escudo):", (await pagar(m2, txid, { secret: e.RESERVA_SECRET })).enlace);
console.log("final:", await leerPrestamo(txid));
