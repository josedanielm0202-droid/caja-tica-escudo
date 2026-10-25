import { useState } from "react";
import { acortarClave } from "../billetera/firmante";
import { useBilletera } from "../billetera/useBilletera";
import { CUENTA_DEMO, MOVIMIENTOS_DEMO } from "../datos/demoTransacciones";
import { textoRelativo, type ItemFeed } from "../lib/feedHistorial";
import { leerSesion } from "../lib/sesionMovimientos";
import { useTitulo } from "../lib/titulo";
import { ETIQUETA_TIPO } from "../lib/tiposMovimiento";
import { useFeedHorizon } from "../lib/useFeedHorizon";

export function Historial() {
  useTitulo("Historial");
  const billetera = useBilletera();
  const cuenta = billetera.publicKey ?? CUENTA_DEMO;
  const feed = useFeedHorizon(cuenta);
  const [sesion] = useState(() => leerSesion(localStorage));
  const [reloj] = useState(() => Date.now());
  const ahora = feed.tipo === "listo" ? feed.ahora : reloj;

  return (
    <div className="pagina">
      <h1>Historial</h1>
      <section className="pagina" aria-labelledby="feed-titulo">
        <h2 id="feed-titulo">Feed en vivo</h2>
        <p className="suave">
          {cuenta
            ? `Cuenta ${acortarClave(cuenta)}${billetera.publicKey ? "" : " del demo"}. Se vuelve a leer cada 15 segundos en Horizon testnet.`
            : "No hay cuenta para leer."}
        </p>
        {feed.tipo === "cargando" ? <p role="status">Leyendo movimientos…</p> : null}
        {feed.tipo === "error" ? (
          <p className="error" role="alert">
            No pude leer el feed. {feed.mensaje}
          </p>
        ) : null}
        {feed.tipo === "listo" && feed.error ? (
          <p className="error" role="alert">
            No pude actualizar: {feed.error}. Sigo mostrando la última lectura.
          </p>
        ) : null}
        {feed.tipo === "listo" && feed.items.length === 0 ? <p className="suave">Esta cuenta todavía no tiene operaciones.</p> : null}
        {feed.tipo === "listo" ? <ListaFeed items={feed.items} ahora={ahora} /> : null}
      </section>
      <section className="pagina" aria-labelledby="sesion-titulo">
        <h2 id="sesion-titulo">En esta sesión</h2>
        {sesion.length === 0 ? (
          <p className="suave">Cuando pidas USDC o pagues una línea de planilla, el hash queda guardado en este navegador.</p>
        ) : (
          <ul className="lista">
            {sesion.map((item) => (
              <li key={item.hash} className="tarjeta">
                <p className="kicker">
                  {ETIQUETA_TIPO[item.tipo]} · {textoRelativo(new Date(item.cuando).toISOString(), ahora)}
                </p>
                <h2>{item.titulo}</h2>
                <p>
                  <a href={item.enlace} target="_blank" rel="noreferrer">
                    Ver en Stellar Expert
                  </a>
                </p>
                <p className="mono suave">{item.hash}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="pagina" aria-labelledby="demo-titulo">
        <h2 id="demo-titulo">Transacciones del demo</h2>
        <p className="suave">Sacadas de docs/transacciones.md. El BTC de la bóveda abre el explorador de Signet; el resto, Stellar Expert.</p>
        <ul className="lista">
          {MOVIMIENTOS_DEMO.map((item) => (
            <li key={item.enlace} className="tarjeta">
              <p className="kicker">
                {ETIQUETA_TIPO[item.tipo]}
                {item.fecha ? ` · ${item.fecha}` : ""}
              </p>
              <h2>{item.paso}</h2>
              {item.resultado ? <p>{item.resultado}</p> : null}
              <p>
                <a href={item.enlace} target="_blank" rel="noreferrer">
                  {item.enlace.includes("stellar.expert") ? "Ver en Stellar Expert" : "Ver en el explorador"}
                </a>
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ListaFeed({ items, ahora }: { items: ItemFeed[]; ahora: number }) {
  return (
    <ul className="lista">
      {items.map((item) => (
        <li key={item.hash} className="tarjeta">
          <p className="kicker">
            {ETIQUETA_TIPO[item.tipo]}
            {item.creado ? ` · ${textoRelativo(item.creado, ahora)}` : ""}
          </p>
          <h2>{item.titulo}</h2>
          {item.detalle ? <p>{item.detalle}</p> : null}
          <p>
            <a href={item.enlace} target="_blank" rel="noreferrer">
              Ver en Stellar Expert
            </a>
          </p>
        </li>
      ))}
    </ul>
  );
}
