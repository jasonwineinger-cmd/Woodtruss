# Woodtruss test status

- Batch: 024
- Integrated verification: 2026-11-22T02:34:02Z (UTC)
- Command: `npm run check` (TypeScript check, compilation and complete automated suite)
- Result: **462 passed, 0 failed, 0 skipped**
- Latest tested implementation: [`594608f67cfd9497d28cef9bc94f4cf7b72b0a47`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/594608f67cfd9497d28cef9bc94f4cf7b72b0a47)
- Baseline: `6f2b8e46d7091fde5f8ad69375a95e8bbf4cd3df` (453 passed)
- Frame: local end-action recovery and private released rotations pass independent beam cases; no-shear USDA comparison balances but does not reproduce published Table VIII.

This status-only commit records the tested implementation SHA, not its own SHA. The 50-foot maximum and fabrication lock are unchanged. Passing software tests is not structural verification. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for remaining work.
