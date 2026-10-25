import { expertTx } from "../../../writz/config";
import type { TipoMovimiento } from "./tiposMovimiento";

export interface OperacionHorizon {
  type?: string;
  created_at?: string;
  transaction_hash?: string;
  transaction_successful?: boolean;
  asset_code?: string;
  amount?: string;
  parameters?: { value?: string; type?: string }[];
  asset_balance_changes?: { asset_code?: string; amount?: string }[];
}

export interface ItemFeed {
  hash: string;
  enlace: string;
  tipo: TipoMovimiento;
  titulo: string;
  detalle: string;
  creado: string;
}

export function textoRelativo(iso: string, ahora: number): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const segundos = Math.max(0, Math.round((ahora - t) / 1000));
  if (segundos < 45) return "hace un momento";
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return minutos === 1 ? "hace 1 min" : `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return horas === 1 ? "hace 1 h" : `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}

function asciiDeBase64(valor: string): string {
  try {
    const bin = atob(valor);
    let texto = "";
    for (let i = 0; i < bin.length; i++) {
      const c = bin.charCodeAt(i);
      if (c >= 32 && c < 127) texto += String.fromCharCode(c);
    }
    return texto.toLowerCase();
  } catch {
    return "";
  }
}

export function simboloContrato(op: OperacionHorizon): string {
  for (const param of op.parameters ?? []) {
    if (param.type !== "Sym" || !param.value) continue;
    const texto = asciiDeBase64(param.value);
    if (texto) return texto;
  }
  return "";
}

function montoUsdc(op: OperacionHorizon): string {
  const cambio = (op.asset_balance_changes ?? []).find((item) => item.asset_code === "USDC" && item.amount);
  if (cambio?.amount) return `${cambio.amount.replace(/0+$/, "").replace(/\.$/, "")} USDC`;
  if (op.amount && op.asset_code) return `${op.amount} ${op.asset_code}`;
  return "";
}

export function clasificarOperacion(op: OperacionHorizon): { tipo: TipoMovimiento; titulo: string; detalle: string } {
  const simbolo = simboloContrato(op);
  const monto = montoUsdc(op);
  if (simbolo.includes("liquid")) return { tipo: "liquidacion", titulo: "Liquidación", detalle: monto };
  if (simbolo.includes("borrow")) return { tipo: "prestamo", titulo: "Préstamo", detalle: monto || "USDC prestado" };
  if (simbolo.includes("repay")) return { tipo: "pago", titulo: "Pago del préstamo", detalle: monto };
  if (simbolo.includes("deposit")) return { tipo: "deposito", titulo: "Depósito", detalle: monto || "BTC en la bóveda" };
  if (simbolo.includes("transfer") || op.type === "payment" || op.type === "path_payment_strict_receive") {
    return { tipo: "pago", titulo: "Pago en USDC", detalle: monto };
  }
  if (op.type === "change_trust") return { tipo: "otro", titulo: "Línea de confianza", detalle: op.asset_code ?? "USDC" };
  if (op.type === "create_account") return { tipo: "otro", titulo: "Cuenta nueva", detalle: "" };
  return { tipo: "otro", titulo: "Movimiento", detalle: simbolo || op.type || "" };
}

export function movimientosDeHorizon(cuerpo: unknown): ItemFeed[] {
  const records = (cuerpo as { _embedded?: { records?: OperacionHorizon[] } } | null)?._embedded?.records;
  if (!Array.isArray(records)) return [];
  const vistos = new Set<string>();
  const items: ItemFeed[] = [];
  for (const op of records) {
    const hash = op?.transaction_hash?.toLowerCase();
    if (!hash || op.transaction_successful === false || vistos.has(hash)) continue;
    vistos.add(hash);
    const clase = clasificarOperacion(op);
    items.push({
      hash,
      enlace: expertTx(hash),
      tipo: clase.tipo,
      titulo: clase.titulo,
      detalle: clase.detalle,
      creado: op.created_at ?? "",
    });
  }
  return items;
}

export function urlOperaciones(cuenta: string): string {
  return `https://horizon-testnet.stellar.org/accounts/${cuenta}/operations?order=desc&limit=12`;
}
