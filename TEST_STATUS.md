# Woodtruss test status

- Batch: 038
- Integrated verification: 2026-11-22T06:04:41Z (UTC)
- Command: `npm run check` (TypeScript check, compilation and complete automated suite)
- Result: **610 passed, 0 failed, 0 skipped**
- Latest tested implementation: [`883aadeeb3382c6afd819f24fb4138713da66d53`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/883aadeeb3382c6afd819f24fb4138713da66d53)
- Baseline: `21cb5d189f1948284d73db57dfdf79142fcd874d` (601 passed)
- Scissor frame: exact directed properties, authored restraints and explicit weighted reactions verified on a 20-ft hand case and a fully released 50-ft pin-jointed limit. No site loads, member sizing, actual bearing, plate or fabrication approval.

This status-only commit records the tested implementation SHA, not its own SHA. The 50-foot maximum and fabrication lock are unchanged. Passing software tests is not structural verification. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for remaining work.
