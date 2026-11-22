# Woodtruss test status

- Batch: 017
- Integrated verification: 2026-11-22T00:48:43Z (UTC)
- Command: `npm run check` (TypeScript check, compilation and complete automated suite)
- Result: **378 passed, 0 failed, 0 skipped**
- Latest tested implementation: [`b417d502eb39fd8d958651494a4ef2454442430b`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/b417d502eb39fd8d958651494a4ef2454442430b)
- Baseline: `e365cb34766a53af48d36ddfdb7cc9a96153b318` (366 passed)
- CLI: `--authored-model` explicitly solves only the supplied stable two-bearing graph and one signed case. No PDF inference, code loads or fabrication.

This status-only commit records the tested implementation SHA, not its own SHA. The 50-foot maximum and fabrication lock are unchanged. Passing software tests is not structural verification. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for remaining work.
