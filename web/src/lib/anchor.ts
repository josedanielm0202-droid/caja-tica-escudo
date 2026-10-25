/**
 * "Cambiar a colones" con un anchor de Stellar.
 * SEP-1 (stellar.toml) → SEP-10 (JWT) → SEP-24 (retiro interactivo).
 * El dominio se cambia con VITE_ANCHOR_DOMAIN (por defecto el socio de prueba
 * testanchor.stellar.org). En producción: MoneyGram u otro anchor con SINPE.
 * Acá no hay llaves: la firma la hace la billetera conectada.
 */
import { Asset, Horizon, Operation, TransactionBuilder, type Transaction } from "@stellar/stellar-sdk";

export const DOMINIO_ANCHOR_DEFECTO = "testanchor.stellar.org";
export const HORIZON_TESTNET = "https://horizon-testnet.stellar.org";
export const PASSPHRASE_TESTNET = "Test SDF Network ; September 2015";

export type Fetch = typeof fetch;
export type FirmarXdr = (xdr: string, passphrase: string) => Promise<string>;

export interface MonedaToml {
  code: string;
  issuer?: string;
}
export interface InfoToml {
  signingKey: string;
  webAuth: string;
  transferServer24: string;
  networkPassphrase: string;
  monedas: MonedaToml[];
}

export function dominioAnchor(valor?: string): string {
  const limpio = (valor ?? "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return limpio || DOMINIO_ANCHOR_DEFECTO;
}

function valorToml(crudo: string): string {
  const v = crudo.trim();
  const m = /^"((?:[^"\\]|\\.)*)"/.exec(v) ?? /^'([^']*)'/.exec(v);
  if (m) return m[1];
  return v.replace(/\s+#.*$/, "");
}

/** Parser mínimo de stellar.toml: claves de arriba y las tablas [[CURRENCIES]]. */
export function parsearToml(texto: string): InfoToml {
  const raiz: Record<string, string> = {};
  const monedas: MonedaToml[] = [];
  let seccion: "raiz" | "moneda" | "otra" = "raiz";
  let actual: Record<string, string> = {};
  const cerrar = () => {
    if (seccion === "moneda" && actual.code) monedas.push({ code: actual.code, issuer: actual.issuer });
  };
  for (const linea of texto.split(/\r?\n/)) {
    const l = linea.trim();
    if (!l || l.startsWith("#")) continue;
    if (l.startsWith("[")) {
      cerrar();
      actual = {};
      seccion = l === "[[CURRENCIES]]" ? "moneda" : "otra";
      continue;
    }
    const i = l.indexOf("=");
    if (i < 0) continue;
    const clave = l.slice(0, i).trim();
    const valor = valorToml(l.slice(i + 1));
    if (seccion === "raiz") raiz[clave] = valor;
    else if (seccion === "moneda") actual[clave] = valor;
  }
  cerrar();
  if (!raiz.WEB_AUTH_ENDPOINT || !raiz.SIGNING_KEY) throw new Error("El socio no publica autenticación SEP-10.");
  if (!raiz.TRANSFER_SERVER_SEP0024) throw new Error("El socio no ofrece retiros SEP-24.");
  return {
    signingKey: raiz.SIGNING_KEY,
    webAuth: raiz.WEB_AUTH_ENDPOINT,
    transferServer24: raiz.TRANSFER_SERVER_SEP0024.replace(/\/+$/, ""),
    networkPassphrase: raiz.NETWORK_PASSPHRASE || PASSPHRASE_TESTNET,
    monedas,
  };
}

export async function leerToml(dominio: string, f: Fetch = fetch): Promise<InfoToml> {
  const r = await f(`https://${dominio}/.well-known/stellar.toml`);
  if (!r.ok) throw new Error("No pude leer la información del socio (stellar.toml).");
  return parsearToml(await r.text());
}

/** Revisa que el challenge de SEP-10 sea seguro de firmar. */
export function validarChallenge(xdr: string, info: InfoToml, cuenta: string): Transaction {
  const tx = TransactionBuilder.fromXDR(xdr, info.networkPassphrase) as Transaction;
  if (tx.source !== info.signingKey) throw new Error("El challenge no viene del socio.");
  if (tx.sequence !== "0") throw new Error("El challenge no es válido (secuencia).");
  const op = tx.operations[0];
  if (!op || op.type !== "manageData" || op.source !== cuenta) throw new Error("El challenge no es para tu cuenta.");
  if (tx.operations.some((o) => o.type !== "manageData")) throw new Error("El challenge trae operaciones raras.");
  return tx;
}

export async function autenticar(info: InfoToml, cuenta: string, firmar: FirmarXdr, f: Fetch = fetch): Promise<string> {
  const r = await f(`${info.webAuth}?account=${encodeURIComponent(cuenta)}`);
  if (!r.ok) throw new Error("El socio no respondió al pedir el challenge.");
  const { transaction } = (await r.json()) as { transaction?: string };
  if (!transaction) throw new Error("El socio no mandó el challenge.");
  validarChallenge(transaction, info, cuenta);
  const firmado = await firmar(transaction, info.networkPassphrase);
  const r2 = await f(info.webAuth, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction: firmado }),
  });
  const cuerpo = (await r2.json().catch(() => ({}))) as { token?: string; error?: string };
  if (!r2.ok || !cuerpo.token) throw new Error("El socio no aceptó la firma." + (cuerpo.error ? ` (${cuerpo.error})` : ""));
  return cuerpo.token;
}

export async function activosRetiro(info: InfoToml, f: Fetch = fetch): Promise<string[]> {
  const r = await f(`${info.transferServer24}/info`);
  if (!r.ok) throw new Error("No pude leer qué monedas acepta el socio.");
  const j = (await r.json()) as { withdraw?: Record<string, { enabled?: boolean }> };
  return Object.entries(j.withdraw ?? {})
    .filter(([, v]) => v.enabled)
    .map(([k]) => k);
}

/** Prefiere USDC, después SRT, después el primero habilitado. */
export function elegirActivo(habilitados: string[], preferidos = ["USDC", "SRT"]): string | null {
  return preferidos.find((p) => habilitados.includes(p)) ?? habilitados.find((c) => c !== "native") ?? habilitados[0] ?? null;
}

export function peticionRetiro(info: InfoToml, jwt: string, codigo: string, cuenta: string, lang = "es") {
  const cuerpo = new FormData();
  cuerpo.append("asset_code", codigo);
  cuerpo.append("account", cuenta);
  cuerpo.append("lang", lang);
  const moneda = info.monedas.find((m) => m.code === codigo);
  if (moneda?.issuer) cuerpo.append("asset_issuer", moneda.issuer);
  return {
    url: `${info.transferServer24}/transactions/withdraw/interactive`,
    init: { method: "POST", headers: { Authorization: `Bearer ${jwt}` }, body: cuerpo } as RequestInit,
  };
}

export interface RetiroIniciado {
  id: string;
  url: string;
}

export async function iniciarRetiro(
  info: InfoToml,
  jwt: string,
  codigo: string,
  cuenta: string,
  f: Fetch = fetch,
): Promise<RetiroIniciado> {
  const { url, init } = peticionRetiro(info, jwt, codigo, cuenta);
  const r = await f(url, init);
  const j = (await r.json().catch(() => ({}))) as { id?: string; url?: string; error?: string };
  if (!r.ok || !j.url || !j.id) throw new Error("El socio no abrió el retiro." + (j.error ? ` (${j.error})` : ""));
  return { id: j.id, url: j.url };
}

export interface EstadoTx {
  status: string;
  more_info_url?: string;
  withdraw_anchor_account?: string;
  withdraw_memo?: string;
  amount_in?: string;
  stellar_transaction_id?: string;
}

export async function estadoRetiro(info: InfoToml, jwt: string, id: string, f: Fetch = fetch): Promise<EstadoTx> {
  const r = await f(`${info.transferServer24}/transaction?id=${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!r.ok) throw new Error("No pude consultar el estado del retiro.");
  return ((await r.json()) as { transaction: EstadoTx }).transaction;
}

export type FaseSimple = "esperando-datos" | "en-proceso" | "listo" | "error";

export function faseDeEstado(status: string): FaseSimple {
  if (status === "completed") return "listo";
  if (["error", "expired", "refunded", "no_market", "too_small", "too_large"].includes(status)) return "error";
  if (status === "incomplete") return "esperando-datos";
  return "en-proceso";
}

/** ¿La cuenta ya tiene trustline al activo? native siempre sí. */
export async function tieneTrustline(cuenta: string, moneda: MonedaToml, horizon = HORIZON_TESTNET, f: Fetch = fetch) {
  if (moneda.code === "native" || !moneda.issuer) return true;
  const r = await f(`${horizon}/accounts/${cuenta}`);
  if (!r.ok) throw new Error("No encontré tu cuenta en testnet.");
  const j = (await r.json()) as { balances: { asset_code?: string; asset_issuer?: string }[] };
  return j.balances.some((b) => b.asset_code === moneda.code && b.asset_issuer === moneda.issuer);
}

export async function agregarTrustline(cuenta: string, moneda: MonedaToml, firmar: FirmarXdr, horizon = HORIZON_TESTNET) {
  if (!moneda.issuer) throw new Error("Esta moneda no necesita trustline.");
  const server = new Horizon.Server(horizon);
  const fuente = await server.loadAccount(cuenta);
  const tx = new TransactionBuilder(fuente, { fee: "1000", networkPassphrase: PASSPHRASE_TESTNET })
    .addOperation(Operation.changeTrust({ asset: new Asset(moneda.code, moneda.issuer) }))
    .setTimeout(180)
    .build();
  const firmado = await firmar(tx.toXDR(), PASSPHRASE_TESTNET);
  const res = await server.submitTransaction(TransactionBuilder.fromXDR(firmado, PASSPHRASE_TESTNET));
  return res.hash;
}

export function errorSencillo(causa: unknown): string {
  const t = causa instanceof Error ? causa.message : String(causa);
  if (/failed to fetch|network/i.test(t)) return "No hay conexión con el socio. Revisá tu internet e intentá de nuevo.";
  if (/reject|rechaz/i.test(t)) return "Rechazaste la firma en la billetera.";
  return t.length > 220 ? `${t.slice(0, 217)}…` : t;
}
