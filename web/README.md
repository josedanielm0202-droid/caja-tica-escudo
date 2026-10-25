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

## Publicar

**Vercel:** Root Directory `web`, framework Vite, build `npm run build`, output `dist`. Dejá `VITE_BASE_PATH=/`.

**GitHub Pages:** compilá con `VITE_BASE_PATH=/caja-tica-escudo/` y publicá el contenido de `web/dist`. El `404.html` deja funcionar el router al recargar.

## Módulo Writz

La web no llama contratos directo. Importa `../writz` (`units.ts`, `config.ts` y `client.ts`).

- USDC en el contrato: stroops, entero, 7 decimales (`125000000` = 12.5 USDC).
- Salud: basis points (`15000` = 150 %). `null` = sin deuda.
- Semáforo (`semaforo` en `writz/units.ts`): verde ≥ 150 %, amarillo 125–150 %, rojo &lt; 125 %. Bajo 120 % hay riesgo de liquidación.

Los números del panel son un ejemplo. La billetera (Freighter, `Firmante` con `publicKey` y `firmar`) es el siguiente paso.

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
