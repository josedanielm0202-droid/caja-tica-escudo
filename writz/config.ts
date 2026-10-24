// Configuración de Writz en Stellar testnet.
// Fuente: https://github.com/WritzProtocol/writz/blob/main/contracts/deployments/testnet.json
// (verificado el 24 oct 2026, redeploy "second" de writz-lend).
export const WRITZ = {
  network: "testnet",
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
  relayerUrl: "https://api.testnet.writz.xyz",
  bitcoinNetwork: "signet",
  spvCheckpointHeight: 325554,
  contracts: {
    bitcoinSpv: "CAHHY4S4WCIFU4LBSKBI3IP6A4QYR2COV6EACDEBXGPJFDWBJWGOMCLP",
    writzLend: "CCMSOCBVX2S645MQFFXJRHVHRWH2NY62KLOJXNDYFOJRYHIC47EO6ZZK",
    usdc: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
    oracle: "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63",
  },
  // Llave del protocolo (co-firma de la bóveda 2-de-2). testnet.md, 2026-10-24.
  protocolBtcPubkey: "03d2f0699b167138988bf8d14a4655a8708066473b4c59ef40ee4ac500564fb70d",
  minConfirmations: 1,
  minDepositSats: 5000,
} as const;

export const USDC_DECIMALS = 7;
export const BP = 10_000; // 1 = 0.01 %, 10000 = 100 %
export const LIQUIDATION_BP = 12_000; // 120 %: debajo de esto se liquida
export const MIN_BORROW_RATIO_BP = 15_000; // borrow exige 150 % => LTV máximo ≈ 66 %
export const MAX_LTV_BP = 6_666;

export const expertTx = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`;
export const expertContract = (id: string) => `https://stellar.expert/explorer/testnet/contract/${id}`;
export const expertAccount = (g: string) => `https://stellar.expert/explorer/testnet/account/${g}`;
export const signetTx = (txid: string) => `https://mempool.space/signet/tx/${txid}`;
