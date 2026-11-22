# Woodtruss test status

- Batch: 027
- Integrated verification: 2026-11-22T03:20:35Z (UTC)
- Command: `npm run check` (TypeScript check, compilation and complete automated suite)
- Result: **495 passed, 0 failed, 0 skipped**
- Latest tested implementation: [`e8cc6b33956d32a03475b1acb4c2b7b1b12a5e9e`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/e8cc6b33956d32a03475b1acb4c2b7b1b12a5e9e)
- Baseline: `0199607c8991e1a2e2ea40a1c70193050efb9a79` (482 passed)
- Frame: independent ideal shear-release beam and versioned PPSA numerical reconstruction pass. Historical output agreement does not establish the 1984 implementation, physical adequacy or fabrication.

This status-only commit records the tested implementation SHA, not its own SHA. The 50-foot maximum and fabrication lock are unchanged. Passing software tests is not structural verification. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for remaining work.
