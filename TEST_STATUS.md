# Woodtruss test status

- Batch: 064
- Integrated verification: 2026-11-22T12:32:43Z (UTC)
- Command: `npm run check` (TypeScript check, compilation and complete automated suite)
- Result: **770 passed, 0 failed, 0 skipped**
- Latest tested implementation: [`cbf604a541bc531c612c68a48aaa982fee895db7`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/cbf604a541bc531c612c68a48aaa982fee895db7)
- Baseline: `6eba12b1981290a97f5bc3c985820adf9e980602` (765 passed)
- Local plate reference metadata is detached before validation, and exact selected private bytes are copied before hashing. Tests use synthetic data only; no manufacturer authorization, signature, connector capacity or physical release is verified.

This status-only commit records the tested implementation SHA, not its own SHA. The 50-foot maximum and fabrication lock are unchanged. Passing software tests is not structural verification. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for remaining work.
