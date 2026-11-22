# Woodtruss test status

- Batch: 025
- Integrated verification: 2026-11-22T02:48:21Z (UTC)
- Command: `npm run check` (TypeScript check, compilation and complete automated suite)
- Result: **472 passed, 0 failed, 0 skipped**
- Latest tested implementation: [`8230d1789b236ef4e859626ee8072da2362f71db`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/8230d1789b236ef4e859626ee8072da2362f71db)
- Baseline: `a81bbc3d7d1dea5a327dad540c76353efcca4d1b` (462 passed)
- Frame: explicit shear flexibility with rigid member ends and joint loads matches independent cantilever checks. Shear-compatible member loads/releases and full USDA replay remain held.

This status-only commit records the tested implementation SHA, not its own SHA. The 50-foot maximum and fabrication lock are unchanged. Passing software tests is not structural verification. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for remaining work.
