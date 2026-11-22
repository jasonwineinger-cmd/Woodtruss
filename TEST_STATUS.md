# Woodtruss test status

- Batch: 033
- Integrated verification: 2026-11-22T04:47:44Z (UTC)
- Command: `npm run check` (TypeScript check, compilation and complete automated suite)
- Result: **560 passed, 0 failed, 0 skipped**
- Latest tested implementation: [`77de05055e16235226bd8a9dbf57d705c0bb5ad2`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/77de05055e16235226bd8a9dbf57d705c0bb5ad2)
- Baseline: `2bb439e5ded4eb15190def48fe1a3d40f1d065fb` (550 passed)
- Frame/lumber: signed stress extrema on each local rectangular face use modeled force branches and both exact point-force sides, not separate component maxima. No member selection, allowable, or capacity claim.

This status-only commit records the tested implementation SHA, not its own SHA. The 50-foot maximum and fabrication lock are unchanged. Passing software tests is not structural verification. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for remaining work.
