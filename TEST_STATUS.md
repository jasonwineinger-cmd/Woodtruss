# Woodtruss test status

- Batch: 008
- Integrated verification: 2026-11-21T22:33:40Z (UTC)
- Command: `npm run check` (TypeScript check, compilation and complete automated suite)
- Result: **242 passed, 0 failed, 0 skipped**
- Latest tested implementation: [`d270b04621b7d839f433b2f408546a1a67a8d58c`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/d270b04621b7d839f433b2f408546a1a67a8d58c)
- Baseline: `3f24f9c26cf826cd8a6bf7b44ef000f008fcdbe3` (225 passed)
- CLI check: `npm start --silent -- --family mono --format svg` emitted the normalized schematic **NOT FOR FABRICATION**.

The status-only commit records the tested implementation SHA, not its own SHA. The 50-foot maximum span and engineering/fabrication restrictions are unchanged. Passing the suite is not structural verification. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for open work.
