# Woodtruss test status

- Batch: 007
- Integrated verification: 2026-11-21T22:19:16Z (UTC)
- Command: `npm run check` (TypeScript check, compilation and complete automated suite)
- Result: **225 passed, 0 failed, 0 skipped**
- Latest tested implementation: [`8ba76af3b800acd8474643eaf2905bad08306ec6`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/8ba76af3b800acd8474643eaf2905bad08306ec6)
- Baseline: `fcc7d02066c6e79f02b73221ed272d3d8e0aceec` (209 passed)
- CLI check: `npm start --silent -- --family mono --span-ft 30 --pitch 6` emitted a synthetic example, **NOT FOR FABRICATION**.

The status-only commit records the tested implementation SHA, not its own SHA. The 50-foot maximum span and engineering/fabrication restrictions are unchanged. Passing this suite is not structural verification. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for open work.
