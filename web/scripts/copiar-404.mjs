import { copyFileSync } from "node:fs";

// GitHub Pages no reescribe rutas. 404.html igual a index.html deja que
// el router del cliente abra /panel y el resto al recargar.
// Vercel no usa este archivo: web/vercel.json manda las rutas a index.html.
copyFileSync("dist/index.html", "dist/404.html");
