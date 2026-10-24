// Uso: npm run prestar-pagar -- <montoPrestamo> <montoAbono>   (borrow con demo, repay desde reserva)
import "dotenv/config";
import { leerPrestamo, pagar, pedirPrestamo } from "../writz/client.js";
const [m1 = "1", m2 = "0.5"] = process.argv.slice(2);
const txid = process.env.LOAN_TXID!; if (!txid) throw new Error("Falta LOAN_TXID en .env");
console.log("borrow:", (await pedirPrestamo(m1, txid, { secret: process.env.DEMO_SECRET! })).enlace);
console.log("repay (desde demo):", (await pagar(m2, txid, { secret: process.env.DEMO_SECRET! })).enlace);
console.log(await leerPrestamo(txid));
