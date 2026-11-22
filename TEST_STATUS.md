# Woodtruss test status

- Batch: 040
- Integrated verification: 2026-11-22T06:34:03Z (UTC)
- Command: `npm run check` (TypeScript check, compilation and complete automated suite)
- Result: **623 passed, 0 failed, 0 skipped**
- Latest tested implementation: [`76754a6f6aed8583aa4c8fa16657c118c90f0c97`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/76754a6f6aed8583aa4c8fa16657c118c90f0c97)
- Baseline: `d2fd16074d34aa2b63fe29222d7d38ea198fc0cf` (619 passed)
- Observed test comparison: exact signed three-gauge mean, bearing reaction sum and selected-window OLS pass synthetic and numerical checks. Public USDA data are separately scoped; measured truss reproduction, capacity and fabrication remain unverified.

This status-only commit records the tested implementation SHA, not its own SHA. The 50-foot maximum and fabrication lock are unchanged. Passing software tests is not structural verification. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for remaining work.
