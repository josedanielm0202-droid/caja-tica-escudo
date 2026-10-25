/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string;
  /** Txid interno del préstamo de demo. Vacío = datos de ejemplo. */
  readonly VITE_TXID_DEMO?: string;
  /** Colones por 1 USDC, solo para la simulación. */
  readonly VITE_TIPO_CAMBIO_EJEMPLO?: string;
  /** Dominio del anchor SEP-24. Por defecto testanchor.stellar.org. */
  readonly VITE_ANCHOR_DOMAIN?: string;
}

declare module "*.md?raw" {
  const contenido: string;
  export default contenido;
}
