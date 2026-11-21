# Woodtruss test status

- Batch: 006
- Integrated verification: 2026-11-21T22:04:01Z (UTC)
- Command: `npm run check` (TypeScript check, compilation and complete automated suite)
- Result: **209 passed, 0 failed, 0 skipped**
- Latest tested implementation: [`f1ff125c353dac19c9068df7c5afee4c0c4a3853`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/f1ff125c353dac19c9068df7c5afee4c0c4a3853)
- Baseline: `e0972db0f65ca2099561c193ef5c7bd28e1928b5` (192 passed)
- Entry point: `npm start --silent -- --span-ft 24 --pitch 5` ran successfully and emitted only a synthetic `NOT FOR FABRICATION` preview.

The status-only commit records the tested implementation SHA, not its own SHA. The 50-foot maximum span and engineering/fabrication restrictions are unchanged. Passing this suite is not structural verification. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for open work.
