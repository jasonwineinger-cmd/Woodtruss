# Woodtruss test status

- Batch: 053
- Integrated verification: 2026-11-22T09:47:27Z (UTC)
- Command: `npm run check` (TypeScript check, compilation and complete automated suite)
- Result: **705 passed, 0 failed, 0 skipped**
- Latest tested implementation: [`2e51a2a201584ce24554795269fce442c2c40793`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/2e51a2a201584ce24554795269fce442c2c40793)
- Baseline: `7f561bbdab8dcd9296cf02f87d9cee9e46d81388` (700 passed)
- Ordinary Double Fink elastic model uses an exact directed centerline graph and explicit bearings, releases and authored weighted actions. Independent statics and method-of-joints benchmarks are synthetic and do not validate real trusses.

This status-only commit records the tested implementation SHA, not its own SHA. The 50-foot maximum and fabrication lock are unchanged. Passing software tests is not structural verification. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for remaining work.
