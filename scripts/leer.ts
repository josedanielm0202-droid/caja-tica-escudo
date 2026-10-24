// Uso: npm run leer -- <txid interno>   (sin txid: muestra estado del protocolo y saldos)
import "dotenv/config";
import { estadoProtocolo, leerPrestamo, saldoUsdc, tasaPrestamoBp } from "../writz/client.js";
import { stroopsAUsdc } from "../writz/units.js";

const txid = process.argv[2] || process.env.LOAN_TXID;
const ps = await estadoProtocolo();
console.log("Protocolo:", { totalPrestadoUsdc: stroopsAUsdc(BigInt(ps.total_borrowed)), reservaUsdc: stroopsAUsdc(BigInt(ps.reserve_usdc)), tasaAnualBp: await tasaPrestamoBp() });
for (const k of ["DEMO_PUBLIC", "RESERVA_PUBLIC"]) if (process.env[k]) {
  try { console.log(k, "USDC:", stroopsAUsdc(await saldoUsdc(process.env[k]!))); } catch (e: any) { console.log(k, "USDC: sin trustline/saldo"); }
}
if (txid) console.log("Préstamo:", await leerPrestamo(txid));
