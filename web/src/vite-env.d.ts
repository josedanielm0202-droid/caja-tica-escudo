/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string;
  /** Txid interno del préstamo de demo. Vacío = datos de ejemplo. */
  readonly VITE_TXID_DEMO?: string;
}
