# Woodtruss test status

- Batch: 016
- Integrated verification: 2026-11-22T00:35:01Z (UTC)
- Command: `npm run check` (TypeScript check, compilation and complete automated suite)
- Result: **366 passed, 0 failed, 0 skipped**
- Latest tested implementation: [`4dbadf810505e58bfc4112ee8f7a615cd52c58e9`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/4dbadf810505e58bfc4112ee8f7a615cd52c58e9)
- Baseline: `2dc41ef2daa3fc6b1991be98cd5812f7a059eba0` (348 passed)
- CLI: `--double-fink-reference` is generic geometry only. Projected bearing statics is separate from design verification or fabrication.

This status-only commit records the tested implementation SHA, not its own SHA. The 50-foot maximum and fabrication lock are unchanged. Passing software tests is not structural verification. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for remaining work.
