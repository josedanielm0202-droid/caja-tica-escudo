import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";

// @stellar/stellar-sdk@16.4.1 publica imports a una ruta interna de pnpm
// (`lib/esm/node_modules/.pnpm/@stellar_js-xdr@...`) que no viene en el
// paquete. Esos archivos sí están en @stellar/js-xdr/src. Sin este alias el
// build del navegador no puede cargar writz/client.ts.
const jsXdrSrc = new URL("./node_modules/@stellar/js-xdr/src/", import.meta.url);
const bufferEntry = fileURLToPath(new URL("./node_modules/buffer/index.js", import.meta.url));
const sdkEntry = fileURLToPath(new URL("./node_modules/@stellar/stellar-sdk/lib/esm/index.js", import.meta.url));

// writz/ está fuera de /web, así que Node no mira web/node_modules. Devolvemos
// la ruta real del paquete para que el build de /web sea independiente.
function resolverPaquetesWeb(): Plugin {
  return {
    name: "resolver-paquetes-web",
    enforce: "pre",
    resolveId(source) {
      if (source === "buffer" || source === "buffer/") return bufferEntry;
      if (source === "@stellar/stellar-sdk") return sdkEntry;
      return null;
    },
  };
}

function arregloRutaJsXdr(): Plugin {
  const marca = "/@stellar/js-xdr/src/";
  return {
    name: "arreglo-ruta-js-xdr",
    enforce: "pre",
    resolveId(source) {
      if (!source.includes("/.pnpm/") || !source.includes(marca)) return null;
      const resto = source.slice(source.indexOf(marca) + marca.length).split("?")[0] ?? "";
      return fileURLToPath(new URL(resto, jsXdrSrc));
    },
  };
}

// writz/units.ts y writz/client.ts usan el global Buffer de Node, sin importarlo.
// El código fuente de js-xdr también. En el navegador ese global no existe.
// Anteponemos el paquete `buffer` (el mismo que ya usa stellar-sdk) solo en
// esos archivos. No polyfillemos `process`: el SDK mira `process.versions.node`
// para saber si está en Node.
function bufferParaWritzYXdr(): Plugin {
  return {
    name: "buffer-para-writz",
    enforce: "pre",
    transform(code, id) {
      const norm = id.split("?")[0]?.replaceAll("\\", "/") ?? "";
      const esWritz = norm.includes("/writz/") && !norm.includes("/node_modules/");
      const esXdr = norm.includes("/@stellar/js-xdr/src/");
      if (!esWritz && !esXdr) return null;
      if (!/\bBuffer\b/.test(code)) return null;
      if (code.includes("/* buffer-para-writz */")) return null;
      if (/import\s*\{[^}]*\bBuffer\b[^}]*\}\s*from\s*['"]buffer['"]/.test(code)) return null;
      return {
        code: `import { Buffer } from ${JSON.stringify(bufferEntry)}; /* buffer-para-writz */\n${code}`,
        map: null,
      };
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const cruda = (env.VITE_BASE_PATH || "/").trim() || "/";
  const base = cruda.endsWith("/") ? cruda : `${cruda}/`;

  return {
    base,
    plugins: [resolverPaquetesWeb(), react(), arregloRutaJsXdr(), bufferParaWritzYXdr()],
    // El SDK trae rutas rotas: que lo empaquete Vite (con los plugins de arriba)
    // y no el prebundle de esbuild, que no aplica resolveId igual.
    optimizeDeps: {
      include: ["buffer"],
      exclude: ["@stellar/stellar-sdk"],
    },
    server: {
      host: "0.0.0.0",
      port: 43123,
      strictPort: true,
      fs: {
        allow: [fileURLToPath(new URL("..", import.meta.url))],
      },
    },
    preview: {
      host: "0.0.0.0",
      port: 43123,
      strictPort: true,
    },
  };
});
