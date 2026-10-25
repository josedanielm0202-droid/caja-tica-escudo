import { copyFileSync } from "node:fs";

// GitHub Pages no reescribe rutas. 404.html igual a index.html deja que
// el router del cliente abra /panel y el resto al recargar.
copyFileSync("dist/index.html", "dist/404.html");
