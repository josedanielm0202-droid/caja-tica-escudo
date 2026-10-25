# Publicar la app

Vercel es el camino corto. GitHub Pages también sirve, con otra ruta base. No subas `.env`, llaves ni semillas. El txid de abajo es dato público de testnet (está en `docs/transacciones.md`); no es un secreto.

Las variables `VITE_*` se hornean en el build. Si cambiás una, volvé a desplegar.

## Vercel

1. Entrá a [vercel.com/new](https://vercel.com/new) e importá el repo `josedanielm0202-droid/caja-tica-escudo`.
2. **Root Directory:** `web`. Ahí está el `package.json` de la app.
3. Dejá activado **Include source files outside of the Root Directory in the Build Step**. Viene prendido por defecto. La app importa `../writz` y `../docs/transacciones.md`. Si lo apagás, el build no ve esos archivos.
4. **Framework Preset:** Vite.
5. **Install Command:** `npm ci`.
6. **Build Command:** `npm run build`.
7. **Output Directory:** `dist`.
8. Esos tres comandos también están en `vercel.json`, junto con el rewrite de las rutas. Si el panel de Vercel tiene un override, poné los mismos valores.
9. Variables de entorno, en Production y en Preview:

   | Nombre | Valor |
   |---|---|
   | `VITE_TXID_DEMO` | `aeb9c904583d9953e52bf7a8992e5c6fd8c0a5bed8a4727efcea408ed2716864` |
   | `VITE_TIPO_CAMBIO_EJEMPLO` | `512.4` (opcional; si no la ponés, la app usa ese mismo número) |
   | `VITE_BASE_PATH` | `/` o dejala sin definir. En la raíz del dominio la base es `/`. |

10. **Production Branch:** `main`, después de unir el [PR #8](https://github.com/josedanielm0202-droid/caja-tica-escudo/pull/8). Para verla antes del merge, desplegá la rama `rol/juliana`: Vercel arma un Preview con la misma configuración.
11. Deploy.

No hace falta `npm ci` en la raíz del repo. Las dependencias de la app viven en `web/package-lock.json`.

`vercel.json` manda `/(.*)` a `/index.html` para que `/panel`, `/prestamo`, `/planilla` e `/historial` sobrevivan al recargar. Vercel entrega primero los archivos que sí existen (`/assets/…`, `/favicon.svg`) y el rewrite solo cubre el resto. El build igual copia `dist/404.html`; Pages lo usa, Vercel no lo necesita.

## GitHub Pages

Pages no lee `vercel.json`. El build copia `index.html` a `404.html` para que una ruta como `/panel` no se pierda al recargar.

1. Compilá desde `web` con la ruta del sitio del proyecto (barra al final):

   ```bash
   cd web
   npm ci
   VITE_BASE_PATH=/caja-tica-escudo/ VITE_TXID_DEMO=aeb9c904583d9953e52bf7a8992e5c6fd8c0a5bed8a4727efcea408ed2716864 npm run build
   ```

2. Publicá el contenido de `web/dist` (GitHub Pages, rama `gh-pages` o la carpeta que ya uses). El sitio queda en `https://josedanielm0202-droid.github.io/caja-tica-escudo/`.
3. `VITE_TIPO_CAMBIO_EJEMPLO` es opcional, igual que en Vercel. Si el sitio no es de proyecto y vive en la raíz del dominio, usá `VITE_BASE_PATH=/`.

En Pages no pongas la base de Vercel (`/`) si la URL lleva `/caja-tica-escudo/`: los JS y el CSS no cargarían.
