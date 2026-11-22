# Woodtruss test status

- Batch: 043
- Integrated verification: 2026-11-22T07:18:21Z (UTC)
- Command: `npm run check` (TypeScript check, compilation and complete automated suite)
- Result: **651 passed, 0 failed, 0 skipped**
- Latest tested implementation: [`1a882d98814f14ee73aca0325299805a3c3e7677`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/1a882d98814f14ee73aca0325299805a3c3e7677)
- Baseline: `5a70e7659286d9855aae0fba12d30146dce614cb` (641 passed)
- Signed scissor residuals require independently declared model/test identity and exact gauge, bearing and step pairing. Tests use synthetic observations; there is no USDA replay, model calibration, capacity or fabrication authority.

This status-only commit records the tested implementation SHA, not its own SHA. The 50-foot maximum and fabrication lock are unchanged. Passing software tests is not structural verification. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for remaining work.
