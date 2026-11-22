# Woodtruss test status

- Batch: 035
- Integrated verification: 2026-11-22T05:19:09Z (UTC)
- Command: `npm run check` (TypeScript check, compilation and complete automated suite)
- Result: **582 passed, 0 failed, 0 skipped**
- Latest tested implementation: [`b4b806e975ce1ddd20b1507046d76e2f7cea485d`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/b4b806e975ce1ddd20b1507046d76e2f7cea485d)
- Baseline: `82a18a6f1d4823d7c59d739c978d841de793c5c0` (570 passed)
- Frame/lumber: exact user-authored load weights and references are retained, compatible physical actions are combined with compensated arithmetic, and every resulting state is independently re-solved. No code factors, capacity or selection claims.

This status-only commit records the tested implementation SHA, not its own SHA. The 50-foot maximum and fabrication lock are unchanged. Passing software tests is not structural verification. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for remaining work.
