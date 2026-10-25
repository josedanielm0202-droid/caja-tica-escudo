// Servidor mínimo de salud (GET /salud) y keep-alive para Render gratis.
import { createServer, type Server } from "node:http";

export function crearServidorSalud(): Server {
  return createServer((req, res) => {
    if (req.method === "GET" && (req.url ?? "").split("?")[0] === "/salud") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" }).end("ok");
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("no encontrado");
  });
}

/** Puerto del servidor de salud: ESCUDO_PUERTO o PORT (Render). Sin ninguno, no hay servidor. */
export function puertoSalud(env: NodeJS.ProcessEnv = process.env): number | undefined {
  const crudo = env.ESCUDO_PUERTO ?? env.PORT;
  if (!crudo) return undefined;
  const n = Number(crudo);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export function urlKeepAlive(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const u = (env.ESCUDO_KEEPALIVE_URL || env.RENDER_EXTERNAL_URL || "").trim();
  return u ? u.replace(/\/+$/, "") : undefined;
}

export function keepAliveS(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.ESCUDO_KEEPALIVE_S);
  return Number.isFinite(n) && n > 0 ? n : 600;
}

export interface DepsKeepAlive {
  url: string;
  cadaMs: number;
  fetch?: typeof fetch;
  log?: (m: string) => void;
}

/** Pide `${url}/salud` cada `cadaMs`. Los errores se registran y nunca botan el proceso. Devuelve una función para parar. */
export function iniciarKeepAlive(d: DepsKeepAlive): () => void {
  const f = d.fetch ?? fetch;
  const log = d.log ?? ((m) => console.warn(m));
  const destino = `${d.url}/salud`;
  const t = setInterval(() => {
    Promise.resolve()
      .then(() => f(destino))
      .then((r) => { if (!r.ok) log(`Keep-alive: ${destino} respondió ${r.status}`); })
      .catch((e: unknown) => log(`Keep-alive: falló ${destino}: ${e instanceof Error ? e.message : String(e)}`));
  }, d.cadaMs);
  t.unref?.();
  return () => clearInterval(t);
}
