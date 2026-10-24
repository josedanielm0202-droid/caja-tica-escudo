# Transacciones reales del demo (testnet, 24-oct-2026)

Préstamo (txid interno, usar como `LOAN_TXID`): `aeb9c904583d9953e52bf7a8992e5c6fd8c0a5bed8a4727efcea408ed2716864`
Cuenta demo: [GCRX6T2X…FJUE](https://stellar.expert/explorer/testnet/account/GCRX6T2XP37JTXCP75WBZOWDM4KIJX3QAAGWAMMKGXZBQZ2NW3KUFJUE) · Reserva Escudo: [GBYN3YA5…KOVF](https://stellar.expert/explorer/testnet/account/GBYN3YA5B2XMIDCG4F3X7ENLYPTNMDBZUY2LD7CBRJOJ5DKE36J5KOVF)

| Paso | Enlace | Resultado |
|---|---|---|
| BTC a la bóveda (Signet, 10 000 sats) | [646871d2…b9ae](https://mempool.space/signet/tx/646871d28e40eafc7e72a4d8bea5c0d86f5c2e99a8f72be553993d5804c9b9ae) | bóveda `tb1qh98q…chhuh` |
| Trustline USDC demo | [04843406…1225](https://stellar.expert/explorer/testnet/tx/04843406f8147a9e19093443ba8e6c825d0e444573f203051ab8a27d6ddc1225) | |
| Trustline USDC reserva | [d43f32ed…446a](https://stellar.expert/explorer/testnet/tx/d43f32ed9298bd509c7ab4d73d173497f23ed60673ac72f5de1c3a69ca4f446a) | |
| `deposit` (SPV + key_sig) | [ef6d4c49…80ce](https://stellar.expert/explorer/testnet/tx/ef6d4c49ec9b453be3023490c2dc2cd0e92a6bb3c80fec813591a9fc05d880ce) | posición Active, 10 000 sats, deuda 0 |
| `borrow` 3 USDC (demo) | [332b30a1…e6fe](https://stellar.expert/explorer/testnet/tx/332b30a127d21b3db6d2be0d35514510f06a562a9db98126614e5fbd6116e6fe) | deuda 3, salud 26825 bp (268 %) |
| `transfer` 1 USDC demo → reserva | [0bdbd207…52c5](https://stellar.expert/explorer/testnet/tx/0bdbd207ad4695c5a86cc6834d41dc92d48f7beb81437191d9106d5c2ced52c5) | fondea la reserva |
| `repay` 1 USDC desde la reserva (abono del Escudo) | [de0fe085…b179](https://stellar.expert/explorer/testnet/tx/de0fe085870c3403356dfabd74546fbeb423a73253d70d1fa9521e126585b179) | deuda 2, salud 40238 bp (402 %) |
