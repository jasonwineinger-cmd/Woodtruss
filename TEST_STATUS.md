# Woodtruss test status

- Batch: 042
- Integrated verification: 2026-11-22T07:05:16Z (UTC)
- Command: `npm run check` (TypeScript check, compilation and complete automated suite)
- Result: **641 passed, 0 failed, 0 skipped**
- Latest tested implementation: [`cbb3b320b7dee9ead36989e8a1924066cc018e9f`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/cbb3b320b7dee9ead36989e8a1924066cc018e9f)
- Baseline: `f59574be3b53df905b31de643bf699e3f04e2972` (633 passed)
- The three modeled scissor gauges and signed vertical bearing readings now follow exact authored load cases before and after horizontal restraint. They are never presented as measured stiffness, test reproduction, bearing capacity or fabrication authority.

This status-only commit records the tested implementation SHA, not its own SHA. The 50-foot maximum and fabrication lock are unchanged. Passing software tests is not structural verification. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for remaining work.
