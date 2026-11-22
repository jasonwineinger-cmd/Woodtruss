# Woodtruss test status

- Batch: 068
- Integrated verification: 2026-11-22T13:34:04Z (UTC)
- Command: `npm run check` (TypeScript check, compilation and complete automated suite)
- Result: **792 passed, 0 failed, 0 skipped**
- Latest tested implementation: [`2777848d8da8bf89739cf77aa7239ea671efb9fe`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/2777848d8da8bf89739cf77aa7239ea671efb9fe)
- Baseline: `c6add41627772b394c41d3e86156bba907c0130f` (786 passed)
- Exact explicit authored displacements distinguish global joint coordinates from directed local stations. Independent inclined triangle and offset-bar tests are synthetic; no physical displacement, bearing, allowable span or release is verified.

This status-only commit records the tested implementation SHA, not its own SHA. The 50-foot maximum and fabrication lock are unchanged. Passing software tests is not structural verification. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for remaining work.
