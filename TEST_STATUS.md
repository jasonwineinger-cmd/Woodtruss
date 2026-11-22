# Woodtruss test status

- Batch: 058
- Integrated verification: 2026-11-22T11:02:42Z (UTC)
- Command: `npm run check` (TypeScript check, compilation and complete automated suite)
- Result: **734 passed, 0 failed, 0 skipped**
- Latest tested implementation: [`460e822d99d770465d1c47fd046fd7c9671b1756`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/460e822d99d770465d1c47fd046fd7c9671b1756)
- Baseline: `e1b52b0ed782bb9f2ce7bee48fe28c45264009a2` (727 passed)
- Exact directed gross section and selected modulus comparison uses only supplied catalog data. Synthetic results do not verify lumber suitability, capacity, actual fixity or fabrication approval.

This status-only commit records the tested implementation SHA, not its own SHA. The 50-foot maximum and fabrication lock are unchanged. Passing software tests is not structural verification. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for remaining work.
