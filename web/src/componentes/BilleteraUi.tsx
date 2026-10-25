import { expertAccount } from "../../../writz/config";
import { USDC_ACTIVO_PRUEBA, acortarClave } from "../billetera/firmante";
import { useBilletera } from "../billetera/useBilletera";

export function BotonBilletera() {
  const billetera = useBilletera();

  if (billetera.conectada && billetera.publicKey) {
    const corta = acortarClave(billetera.publicKey);
    return (
      <>
        <a
          className="clave"
          href={expertAccount(billetera.publicKey)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Cuenta ${corta}. Abrir en Stellar Expert, testnet.`}
        >
          {corta}
        </a>
        <button type="button" className="boton boton--secundario boton--chico" onClick={billetera.desconectar}>
          Desconectar
        </button>
      </>
    );
  }

  const ocupado = billetera.fase === "revisando" || billetera.fase === "conectando";
  return (
    <button
      type="button"
      className="boton boton--chico"
      onClick={() => void billetera.conectar()}
      disabled={ocupado}
      aria-busy={ocupado || undefined}
    >
      {billetera.fase === "conectando" ? "Conectando…" : "Conectar billetera"}
    </button>
  );
}

export function EstadoBilletera() {
  const billetera = useBilletera();

  if (billetera.fase === "revisando") {
    return (
      <p className="suave" role="status">
        Buscando Freighter…
      </p>
    );
  }

  return (
    <div className="estado-billetera">
      {billetera.fase === "no-instalada" ? <TarjetaInstalar /> : null}
      {billetera.error ? (
        <p className="error" role="alert">
          {billetera.error}
        </p>
      ) : null}
      {billetera.conectada && billetera.red && !billetera.red.esTestnet ? <AvisoRed /> : null}
      {billetera.conectada && billetera.red?.esTestnet ? <SaldoCuenta /> : null}
    </div>
  );
}

function TarjetaInstalar() {
  return (
    <section className="tarjeta" id="instalar-freighter" aria-labelledby="instalar-titulo">
      <h2 id="instalar-titulo">Instalá Freighter</h2>
      <p>
        Este demo usa Freighter, la extensión de Stellar, para leer tu cuenta de prueba. Acá no se guarda
        ninguna llave.
      </p>
      <p>Si no la tenés instalada, bajala y volvé a esta página.</p>
      <p>
        <a className="boton" href="https://www.freighter.app" target="_blank" rel="noreferrer">
          Instalar Freighter
        </a>
      </p>
      <p className="suave">Es un demo de testnet. No conectés una cuenta con plata de la red pública.</p>
    </section>
  );
}

function AvisoRed() {
  return (
    <div className="aviso" role="alert">
      <p>
        <strong>Freighter no está en Testnet.</strong> Cambiá la red en la extensión a Testnet. La frase
        tiene que ser <code>Test SDF Network ; September 2015</code>. Hasta que lo hagas, esta página no
        arma un firmante y no lee el saldo.
      </p>
    </div>
  );
}

function SaldoCuenta() {
  const billetera = useBilletera();
  return (
    <section className="tarjeta" aria-labelledby="saldo-titulo">
      <h2 id="saldo-titulo">USDC de prueba</h2>
      {billetera.saldo.estado === "cargando" ? <p role="status">Leyendo el saldo…</p> : null}
      {billetera.saldo.estado === "listo" ? (
        <p>
          <strong>{billetera.saldo.texto}</strong>
          <span className="suave"> en esta cuenta, en la red de prueba.</span>
        </p>
      ) : null}
      {billetera.saldo.estado === "sin-cuenta" ? (
        <p>
          No pudimos leer el USDC. Si la cuenta es nueva, primero necesita XLM de testnet y una trustline al
          activo <code className="mono">{USDC_ACTIVO_PRUEBA}</code>.
        </p>
      ) : null}
      {billetera.saldo.estado === "fallo" ? (
        <p>
          No se pudo leer el saldo.{" "}
          <button type="button" className="boton boton--secundario boton--chico" onClick={billetera.reintentarSaldo}>
            Reintentar
          </button>
        </p>
      ) : null}
    </section>
  );
}
