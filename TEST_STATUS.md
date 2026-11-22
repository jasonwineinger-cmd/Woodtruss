# Woodtruss test status

- Batch: 057
- Integrated verification: 2026-11-22T10:48:06Z (UTC)
- Command: `npm run check` (TypeScript check, compilation and complete automated suite)
- Result: **727 passed, 0 failed, 0 skipped**
- Latest tested implementation: [`612c93b315d178fa1b4fae9e368ffa5bb7e548ca`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/612c93b315d178fa1b4fae9e368ffa5bb7e548ca)
- Baseline: `1583f2239f7b78693ecb24ed7059684a5995c702` (723 passed)
- TPSX design-side requirement declarations bind to exact joint and member links; neither declared area method nor explicit zero is interpreted as observed inspection or capacity.

This status-only commit records the tested implementation SHA, not its own SHA. The 50-foot maximum and fabrication lock are unchanged. Passing software tests is not structural verification. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for remaining work.
