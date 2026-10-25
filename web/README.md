# Caja Tica — app web

Pantallas del demo: Inicio, Panel, Pedir préstamo, Planilla y Historial. El texto está en español de Costa Rica (voseo).

El estilo de la app es la dirección A: vidrio líquido, modo oscuro, degradado de azul a naranja. Las maquetas A y B siguen en [`mockups/`](mockups/) como referencia; no las carga Vite.

En el teléfono el vidrio es un relleno oscuro (el texto tiene que leerse igual si el navegador no desenfoque). El `backdrop-filter` de 12px solo entra desde 900px de ancho. Las manchas del fondo no se desenfocan, y con `prefers-reduced-motion` dejan de flotar.

## Correr

Desde esta carpeta (`/web`), con su propio `package.json`. No hace falta instalar la raíz.

```bash
npm install
npm run dev
```

Abre http://127.0.0.1:43123

```bash
npm run build
npm run preview
```

El build estático queda en `dist/`. También se copia `dist/404.html` para que GitHub Pages no pierda las rutas al recargar.

## Variable de entorno

Copiá `.env.example` a `.env` si ocupás cambiar la ruta base. No subas `.env`: no lleva secretos, pero tampoco va al repo.

| Variable | Uso |
|---|---|
| `VITE_BASE_PATH` | `/` en Vercel. En GitHub Pages, `/caja-tica-escudo/` (con barra al final). |
| `VITE_TXID_DEMO` | Txid interno del préstamo, el mismo que `LOAN_TXID`. Vacío = datos de ejemplo. En la app también vale `?txid=`. |
| `VITE_TIPO_CAMBIO_EJEMPLO` | Colones por 1 USDC, solo para la planilla y el retiro simulado. Por defecto `512.4`. No es la tasa del mercado. |

## Publicar

Los pasos están en [DEPLOY.md](DEPLOY.md). En Vercel: Root Directory `web`, Vite, `npm run build`, salida `dist`, `VITE_BASE_PATH=/` (o sin definirla). En GitHub Pages: `VITE_BASE_PATH=/caja-tica-escudo/` y el `404.html` que copia el build.

## Módulo Writz

La web no llama contratos directo. Importa `../writz` (`units.ts`, `config.ts` y `client.ts`).

- USDC en el contrato: stroops, entero, 7 decimales (`125000000` = 12.5 USDC).
- Salud: basis points (`15000` = 150 %). `null` = sin deuda.
- Semáforo (`semaforo` en `writz/units.ts`): verde ≥ 150 %, amarillo 125–150 %, rojo &lt; 125 %. Bajo 120 % hay riesgo de liquidación.

El panel lee el préstamo con `leerPrestamo` si hay txid (`VITE_TXID_DEMO`, `?txid=` o el campo del Panel). Sin txid, o con `?ejemplo=1`, muestra datos de ejemplo bien marcados. La lectura se repite cada 30 segundos. Si `enRiesgo` es verdadero, aparece el aviso del Escudo.

Pedir préstamo deja el control en 66 % de LTV (`MAX_LTV_BP`). El monto sale de `maximoPrestable`, y al lado se ve el precio de liquidación y la salud que quedaría. El botón llama a `pedirPrestamo` solo con Freighter en testnet y un txid cargado; si no, queda apagado y dice por qué. `pedirPrestamo` recibe el USDC legible: el cliente lo pasa a stroops.

La planilla guarda a quién le pagarías (nombre y monto en colones o USDC) solo en `localStorage`. El total se muestra en USDC y en colones con `VITE_TIPO_CAMBIO_EJEMPLO`, marcado como tipo de cambio de ejemplo, y se compara con el `saldoUsdc` de la cuenta conectada en testnet. El retiro a colones es una simulación: monto, confirmar y un recibo con referencia `SIM-######`. El sello dice «Simulado: no mueve dinero real» y no llama a ningún off-ramp. Si la línea está en USDC y tiene una cuenta `G…`, el botón «Pagar USDC en testnet» usa `enviar` con el firmante de Freighter sobre el contrato USDC. Eso sí mueve USDC de prueba y deja el enlace de Stellar Expert. No convierte a colones.

El historial junta tres listas. Las transacciones del demo salen de `docs/transacciones.md` (se empaquetan al compilar). Lo que pediste o pagaste en esta sesión queda en `localStorage` con hash y enlace. El feed en vivo lee las operaciones de la cuenta conectada, o de la cuenta del demo si no hay billetera, en Horizon testnet cada 15 segundos. Muestra el tiempo relativo, el tipo (préstamo, pago, depósito, liquidación u otro) y el enlace a Stellar Expert. Si Horizon falla, se ve el error y se conserva la última lectura.

La billetera es Freighter: el botón «Conectar billetera» pide la cuenta pública y, si Freighter ya autorizó el sitio, al recargar se vuelve a leer con `getAddress`. No se guarda la llave en el navegador. El firmante solo existe en testnet (`WRITZ.networkPassphrase`) y llama a `signTransaction` de `@stellar/freighter-api`. El saldo usa `saldoUsdc` de `writz/client.ts`.

Otra billetera puede implementar `PasaporteBilletera` en `src/billetera/tipos.ts`. Hoy solo está Freighter.

En `vite dev`, `?demo-billetera=conectada` y `?demo-billetera=otra-red` muestran estados de ejemplo. Ese módulo no entra en el build de producción.

### Buffer y `@stellar/stellar-sdk`

`writz/client.ts` y `writz/units.ts` usan el global `Buffer` de Node y el SDK. La web declara **su propia** copia de las dependencias, la misma versión que la raíz:

- `@stellar/stellar-sdk` `^16.4.1`
- `buffer` `^6.0.3`

Así `cd web && npm install && npm run build` funciona solo, y Vercel puede construir únicamente `/web`. No se tocaron las dependencias de `package.json` de la raíz. Conviene mantener las dos versiones alineadas.

En `vite.config.ts` (no se tocó `writz/`):

1. `writz/` está al lado de `/web`, así que Node no busca en `web/node_modules`. Un `resolveId` apunta `buffer` y `@stellar/stellar-sdk` a los paquetes instalados en `/web`.
2. Otro plugin antepone `import { Buffer } from "<ruta de web/node_modules/buffer>"` en los archivos de `/writz` y en el código de `@stellar/js-xdr` que usan el global `Buffer`. No se polyfillea `process`: el SDK lo usa para detectar si está en Node.
3. stellar-sdk 16.4.1 trae imports rotos a una ruta interna de pnpm (`@stellar/js-xdr`). Un tercer plugin los manda a `node_modules/@stellar/js-xdr/src/`. Si esa ruta ya no aparece en una versión nueva, el plugin no hace nada.

`web/tsconfig.app.json` tiene un `paths` hacia los tipos del SDK para que `tsc` resuelva el import desde `../writz`. La raíz no incluye `/web` (`include` solo tiene writz, scripts y tests), así que no hizo falta excluirla.

Al arrancar, la app corre un chequeo local (sin red): ida y vuelta de un txid con `invertirHex`, el semáforo y que `leerPrestamo` sea una función. Si falla, se ve el error en vez de una pantalla en blanco.
