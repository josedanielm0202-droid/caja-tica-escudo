import { pasaporteFreighter } from "./freighter";
import type { PasaporteBilletera } from "./tipos";

/** Freighter de verdad, o una vista de ejemplo que solo existe en `vite dev`. */
export async function pasaporteActivo(): Promise<PasaporteBilletera> {
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const demo = new URLSearchParams(window.location.search).get("demo-billetera");
    if (demo === "conectada" || demo === "otra-red") {
      const modulo = await import("./demo");
      return modulo.pasaporteDemo(demo);
    }
  }
  return pasaporteFreighter;
}
