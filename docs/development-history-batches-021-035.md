# Woodtruss development status archive: Batches 021–035

## Batch 035 — 2026-11-22T05:19:09Z (UTC)

**Reviewed implementation:** [`b4b806e975ce1ddd20b1507046d76e2f7cea485d`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/b4b806e975ce1ddd20b1507046d76e2f7cea485d). Baseline `82a18a6`: 570 passing. Full `npm run check`: **582 passed, 0 failed, 0 skipped**. Six isolated engineering, evidence and test lanes.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `elastic-frame-authored-load-combinations.ts`: bounded explicit source and term IDs, signed nonzero factors only, original order and source references, no implicit load or all-zero result. |
| 2 Lumber | `elastic-frame-authored-load-combinations-boundary.test.mjs`: strict source/term integrity including unused input, no capacities or cached results, reject absent factors and geometry-basis/station collisions. |
| 3 Connector plates | Independent global inclined mixed-action force/moment and cancellation audit. Correct moments do not establish plate or contact behavior. |
| 4 Geometry | `elastic-frame-combine-authored-actions.ts` and tests: preserve directed member identity, exact uniform basis and point station; compensated addition preserves small signed residuals, with numeric holds. |
| 5 Manufacturing/source | USDA note distinguishes explicitly weighted inputs and declared provenance from code weather combinations, restraint or approval. |
| 6 Testing | `elastic-frame-authored-combination-stress-benchmark.test.mjs`, `elastic-frame-combination-inclined-reference.test.mjs`: independent weighted gravity/uplift, point sides, and inclined physical measure and moment, with no omitted-case leakage. |
| Integration | `elastic-frame-authored-combination-stress.ts`, `README.md`: independently solve weighted actions, never earlier stress peaks; role-binding of all source targets and no claimed fabrication or sizing. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Authored arithmetic is not code/site coverage, capacity or qualified engineering approval. The 50-ft cap is unchanged.

**Next:** Preserve exact reproducible case and model identities in a deliberately separate review record so signed loads can be replayed without stale geometry or a replaced reference. Continue licensed material/connector research only with authoritative sources; no default factors or fabricated approval.

## Batch 034 — 2026-11-22T05:02:30Z (UTC)

**Reviewed implementation:** [`a4263ac9fa5b1db7c2cd88f825ebb4f3fd3d53ed`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/a4263ac9fa5b1db7c2cd88f825ebb4f3fd3d53ed). Baseline `e7f4afd`: 560 passing. Full `npm run check`: **570 passed, 0 failed, 0 skipped**. Six isolated engineering, evidence and test lanes.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `elastic-frame-authored-stress-cases.ts`: replay each unique authored action set on the same frame, supports and selected actual rectangles; reject the whole comparison on any failed case. |
| 2 Lumber | `elastic-frame-authored-stress-cases-boundary.test.mjs`: hold stale-shaped inputs, substituted loads/geometry/results, forged capacity fields, rejected late cases and equal-area wrong section axes. |
| 3 Connector plates | Independent tie and point-side audit. Preserving a solved stress row does not establish plate transfer or capacity. |
| 4 Geometry | `elastic-frame-stress-case-selection.ts`, corresponding tests: exact named member coverage, signed selection, complete governing cut transfer, conflict/metadata rejection and deterministic ties. |
| 5 Manufacturing/source | USDA note distinguishes historical examples from authored comparisons, site case definitions and code rules. |
| 6 Testing | `elastic-frame-authored-stress-cases-benchmark.test.mjs`: independent gravity/uplift/axial fixtures, exact case ties and axial point discontinuity. |
| Integration | `README.md`: explicit library scope, no synthesized load factors, provenance or fabrication rights; unchanged preliminary and 50-ft gates. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Only explicitly supplied cases were solved, not all required cases or design combinations.

**Next:** Add narrowly verified authored load-term provenance suited to the frame solver, with exact replay identity for the model and each state. Hold unsupported action basis, geometry changes and numerical collisions. Do not assign code factors/site loads or promote preview data into capacity or release.

## Batch 033 — 2026-11-22T04:47:44Z (UTC)

**Reviewed implementation:** [`77de05055e16235226bd8a9dbf57d705c0bb5ad2`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/77de05055e16235226bd8a9dbf57d705c0bb5ad2). Baseline `2bb439e`: 550 passing. Full `npm run check`: **560 passed, 0 failed, 0 skipped**. Six isolated engineering, evidence and test lanes.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `elastic-frame-rectangular-stress-extrema.ts`: evaluate signed stress per face at verified coincident axial/moment cuts from one bounded solved member. Shear is retained only as force. |
| 2 Lumber | `elastic-frame-rectangular-stress-extrema-boundary.test.mjs`: reject wrong axes, duplicate or unknown members and supplied strength or force records. Prove no change to the base solver results. |
| 3 Connector plates | Independent derivative and localized plateau/jump audit. A section value is not plate demand, strength or physical load transfer. |
| 4 Geometry | `elastic-frame-rectangular-stress-stations.ts`, corresponding tests: separate normalized branch candidates and exact end/point cuts; reject lost strict station distinctions. |
| 5 Manufacturing/source | USDA reference note distinguishes modern signed face extrema from historical sampled stress values; independently verified mixed-load hand calculations, no release claim. |
| 6 Testing | `elastic-frame-rectangular-stress-extrema-benchmark.test.mjs`: independent mixed loads, true face peaks separate from peak bending, axial jump, plateau and physical face invariance under reversal. |
| Integration | `elastic-frame-solve.ts`, `README.md`: explicit section/member opts in to a single-state diagnostic. Original actions, solver checks, demands and fabrication lock unchanged. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. The stress output assumes an ideal gross rectangle, not a material, limit, buckling, code or connection check. Keep the 50-ft maximum.

**Next:** Bind separately authored load states and explicit same-geometry case IDs so demand summaries can retain the state, exact member, face and point side that actually governed. Keep site rules, allowable values, physical grading and trusted engineering review as separate evidence.

## Batch 032 — 2026-11-22T04:32:46Z (UTC)

**Reviewed implementation:** [`bca71bb8bcf2840b528ff9ecc6470c7f9709a9fe`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/bca71bb8bcf2840b528ff9ecc6470c7f9709a9fe). Baseline `827236a`: 539 passing. Full `npm run check`: **550 passed, 0 failed, 0 skipped**. Six isolated engineering, evidence and test lanes.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `elastic-frame-rectangular-cut-study.ts`: re-solve one exact frame and selected ordered cut, then pass only coincident axial and bending demand into ideal rectangular normal stress. |
| 2 Lumber | `elastic-frame-rectangular-cut-evidence-boundary.test.mjs`: reject swapped/different dimensions, raw demand, invalid selection, and extra strength or competing result inputs. No sizing or design properties. |
| 3 Connector plates | Independently checked physical face signs, axis reversal and distinction between gross-section stress and connector force transfer. No plate check or capacity. |
| 4 Geometry | `rectangular-frame-section-binding.ts`, corresponding tests: oriented gross rectangle A and directional I must numerically match the modeled section to arithmetic precision, not just the area. |
| 5 Manufacturing/source | USDA diagnostic and reference note: separate one-member signed free-body/section stress witness using published end actions and transverse force, without claiming the historical specimen or its capacity. |
| 6 Testing | `elastic-frame-rectangular-cut-study.test.mjs`: independent signed normal stress, point sides, equal-physical-face reversal, and counterexample to combining peaks from different cuts. |
| Integration | `README.md`: document library-only ideal section diagnostic, distinct from any material, selection, code, procurement or fabrication workflow. |

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. This is one exact-cut stress diagnostic; no member strength or structural verification. The 50-ft limit and fabrication lock remain.

**Next:** Derive and independently check signed gross-section normal-stress extrema for each continuous force branch and each face. Evaluate both explicit sides of a point load. The stress-extreme station can differ from the bending-only peak; do not mix states or add design capacity.

## Batch 031 — 2026-11-22T04:17:48Z (UTC)

**Reviewed implementation:** [`432b5b36569efdde0a48413097c4ca71db153a23`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/432b5b36569efdde0a48413097c4ca71db153a23). Baseline `6275c2b`: 532 passing. Full `npm run check`: **539 passed, 0 failed, 0 skipped**. Six isolated engineering, evidence and test lanes.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `elastic-frame-section-demand.ts`, `elastic-frame-section-demand-cuts.test.mjs`: selected exact stations and explicit point-load sides, with bounded dense input and no snapping or mixing of component extrema. |
| 2 Lumber | Independent scope audit separated exact named pin-joint replay from frame cut forces and a possible future co-located rectangular stress study. No sizing, stock or material design values changed. |
| 3 Connector plates | Independent right-segment equilibrium and cut-face sign audit. A generalized cut or model end action is not physical plate transfer or capacity. |
| 4 Geometry | `elastic-frame-section-cuts-axis.test.mjs`: independently resolved inclined point/tip action, reversal of ordered station and side, signed moment reversal. |
| 5 Manufacturing/source | `usda-ppsa-no-shear-diagnostic.test.mjs`, USDA reference note: co-located printed-station diagnostic and point jump are distinct from historical stresses printed at other locations. |
| 6 Testing | `elastic-frame-section-cuts-benchmark.test.mjs`: independent mixed uniform and point demands, both sides, separate exact members and rejection of malformed station/member requests. |
| Integration | `elastic-frame-solve.ts`, `README.md`: optional selected cuts stay nested in the same solved member, with no change to strengths, extrema, 50-ft limit, or fabrication locks. |

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. The co-located vector is preliminary and valid only for one modeled member, station side and solved state. It is not approved plate demand or structural adequacy.

**Next:** Independently bind explicit oriented actual rectangular properties to a single authored case and cut before previewing coincident elastic fiber stress. No code allowables, design interaction, member-wide stress maximum, selection or fabrication are implied.

## Batch 030 — 2026-11-22T04:04:06Z (UTC)

**Reviewed implementation:** [`9b33d8e73f302c2445af5ad0a7f25e7fa286a6bf`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/9b33d8e73f302c2445af5ad0a7f25e7fa286a6bf). Baseline `68038e7`: 518 passing. Full `npm run check`: **532 passed, 0 failed, 0 skipped**. Six isolated engineering, evidence and test lanes.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `elastic-frame-branch-roots.ts`, corresponding regression: exact dyadic Sturm signs for the represented slope polynomial, independent bracket/rounding, repeated and near-edge roots, flat branches and resolution holds. |
| 2 Lumber | `elastic-frame-displacement-boundary.test.mjs`: authored named-joint replay cannot substitute a same-position sampled section or use it as a case receipt. Audited signed extrema against separate serviceability contracts. |
| 3 Connector plates | Independent shear cusp and ordered-axis sign audit; section motion does not establish plate grip, stiffness or capacity. |
| 4 Geometry | `elastic-frame-deflection-branches.ts`, corresponding regression: normalized one-sided local slope shapes with consistent shear and ordered physical stations. |
| 5 Manufacturing/source | `docs/references/usda-ppsa-frame-output-scope.md`: sampled historical deflections remain distinct from modern local extrema and the displaced-end reference; no manufacturing release. |
| 6 Testing | `elastic-frame-deflection-extrema-benchmark.test.mjs`: independent tip-loaded and simply supported Euler benchmarks, shear cusp, ordered-axis reversal and opt-in scope checks. |
| Integration | `elastic-frame-deflection-extrema.ts`, `elastic-frame-deflection-extrema.test.mjs`, `elastic-frame-solve.ts`, `README.md`: distinguish absolute local and straight displaced-chord minima/maxima, include the interior point-load station in the piecewise field and verify affine-motion invariance. |

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. The diagnostics do not establish a design limit or a governing load case, and licensed and qualified engineering evidence remain required. Preserve the 50-ft cap.

**Next:** Return co-located signed section demand for exact authored cuts and explicit point-force sides. Keep one complete force vector per solved load state and do not synthesize design interactions from independent extrema.

## Batch 029 — 2026-11-22T03:47:54Z (UTC)

**Reviewed implementation:** [`5657dd031460a5ea212fcd6f9c5c9ac33aa2e20f`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/5657dd031460a5ea212fcd6f9c5c9ac33aa2e20f). Baseline `955df32`: 507 passing. Full `npm run check`: **518 passed, 0 failed, 0 skipped**. Six isolated engineering, evidence and test lanes.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `packages/analysis/src/elastic-frame-section-displacement.ts`, `tests/elastic-frame-section-displacement.test.mjs`: recover local section motion from signed physical cuts, including explicit shear when present. Independent opposite-end closure in all three local DOFs; positive-part point terms preserve continuous motion. |
| 2 Lumber | Scope audit: authored joint serviceability still uses exact named joints and re-solved receipts, not sampled interior motion. No design value or sizing changed. |
| 3 Connector plates | Independent shear sign, point jump, continuity and released rotation check. Motion is not plate force, stiffness, capacity or manufacturing evidence. |
| 4 Geometry | `tests/elastic-frame-displacement-axis.test.mjs`: signed inclined cantilever calculation and reversal of ordered stations/local translations while preserving the physical CCW rotation. |
| 5 Manufacturing/source | `docs/references/usda-ppsa-frame-output-scope.md`: distinguish legacy joint motion, discrete maximum member deflection and physical between-end displacement. No new manufacturing input or approval. |
| 6 Testing | `tests/elastic-frame-interior-displacement-benchmark.test.mjs`: independent mixed-action cantilever and loaded doubly released beams with and without shear, plus strict station/identity rejection. |
| Integration | `packages/analysis/src/elastic-frame-solve.ts`, `README.md`: explicit requests only, at most 64 stations per member. Preserve original action/resultant balance, local axes, and the 50-ft cap. |

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Selected section motions are neither relative-chord limits nor a complete deflection envelope. Licensed plate values and qualified engineering review still gate manufacturing.

**Next:** Benchmark exact transverse deflection extrema and a clearly defined chord-relative reference separately from sampled motion, with independent signed continuous and point-load cases. Continue the separate co-located demand and authored-combination work before design use. No fabrication release.

## Batch 028 — 2026-11-22T03:35:40Z (UTC)

**Reviewed implementation:** [`ae9f686b99a76aafbb6d54292eb7a708e686166c`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/ae9f686b99a76aafbb6d54292eb7a708e686166c). Baseline `5b8ee8d`: 495 passing. Full `npm run check`: **507 passed, 0 failed, 0 skipped**. Six independent lanes.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `packages/analysis/src/elastic-frame-section-demand.ts`, `tests/elastic-frame-section-demand.test.mjs`: signed local section cuts with extrema at endpoints, both point-load limits and strict interior zero-shear roots; separate force/moment closure at the right end. |
| 2 Lumber | Independent mixed-load section, sign, jump and co-location audit. Component extrema may occur at different stations; no sizing/stress/capacity inferred. |
| 3 Connector/source | `docs/references/usda-ppsa-frame-output-scope.md`, `tests/usda-ppsa-no-shear-diagnostic.test.mjs`: checked printed sample station versus exact bending peak for illustrated member 6. No legacy stress/interaction implementation or connector approval. |
| 4 Geometry | `packages/analysis/src/elastic-frame-section-load-basis.ts`, `tests/elastic-frame-section-load-basis.test.mjs`: signed local physical forces from exact directed member axes; endpoint reversal and finite-range checks. |
| 5 Manufacturing | `tests/elastic-frame-section-stock-evidence-boundary.test.mjs`: a real section record or moment mislabeled as axial does not satisfy exact pin-jointed stock screening. |
| 6 Testing | `tests/elastic-frame-section-demand-benchmark.test.mjs`: independent loaded released beam moment peak and both point-force limits, plus physical projected force basis on an inclined member. |
| Integration | `packages/analysis/src/elastic-frame-solve.ts`, `README.md`: use original physical applied loads and recovered end actions to return a bounded section envelope without an inferred material property or fabrication path. |

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Tested demands are not structural capacities, approval, or a physical benchmark.

**Next:** Verify between-end displacement/deflection against independent loaded-beam results and establish safe same-station demand provenance before design checks. Scope case combinations to authored rules and verified data; no cross-station shortcut. Preserve 50-ft maximum and fabrication locks.

## Batch 027 — 2026-11-22T03:20:35Z (UTC)

**Reviewed implementation:** [`e8cc6b33956d32a03475b1acb4c2b7b1b12a5e9e`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/e8cc6b33956d32a03475b1acb4c2b7b1b12a5e9e). Baseline `0199607`: 482 passing. Full `npm run check`: **495 passed, 0 failed, 0 skipped**. Six independent lanes and a versioned source comparison.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `packages/analysis/src/elastic-frame-shear-release.ts`, `tests/elastic-frame-shear-release.test.mjs`: paired ideal-release stiffness and applied RHS condensation; checked moment redistribution and exact axial-only homogeneous condition. |
| 2 Lumber | `packages/analysis/src/elastic-frame-shear-end-actions.ts`, `tests/elastic-frame-shear-end-actions.test.mjs`: private released rotation recovery and signed full-stiffness end actions, dimensionless conditioning and residual guards. No design data or capacity. |
| 3 Connector/source | `docs/references/usda-ppsa-frame-output-scope.md`, `tests/usda-ppsa-no-shear-diagnostic.test.mjs`: independently reproduced 1972 predecessor reactions and, under a stated combined hypothesis, 48 reported 1984 member actions within one last printed unit. Exact 1984 executable and stated-vs-modeled shear remain distinct. No physical connector validation. |
| 4 Geometry | `packages/analysis/src/elastic-frame-global-element.ts`, `tests/elastic-frame-shear-global-element.test.mjs`: global transform of exact per-end shear release shapes, orientation reversal and axial-only double release. |
| 5 Manufacturing | `tests/elastic-frame-shear-scope.test.mjs`: bounded loaded releases remain preliminary, reject invalid release fields, capacity and machine claims. |
| 6 Testing | `tests/elastic-frame-shear-release-benchmark.test.mjs`: independent force-method propped member reactions and released private rotation with shear. |
| Integration | `packages/analysis/src/elastic-frame-solve.ts`, `README.md`: hold missing joint rotations while recovering element-private rotations and checking member and joint balance. Normal shear-consistent actions are unchanged by the historical diagnostic. |

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. A historical analytical reproduction is not physical truss validation. Engineering approval and fabrication remain held.

**Next:** Add between-end force/moment recovery and independent peak checks for bounded linear load shapes, and keep code/design data, qualified review and real fixture evidence separate. Continue to hold undocumented legacy implementation equivalence and all release. Preserve 50-ft maximum.

## Batch 026 — 2026-11-22T03:03:56Z (UTC)

**Reviewed implementation:** [`d4776f780134165e1d933f6bc8697e5a0eb4de05`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/d4776f780134165e1d933f6bc8697e5a0eb4de05). Baseline `22d35da`: 472 passing. Full `npm run check`: **482 passed, 0 failed, 0 skipped**. Six independent lanes.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `packages/analysis/src/elastic-frame-shear-point-load.ts`, `tests/elastic-frame-shear-point-load.test.mjs`: exact signed homogeneous Timoshenko transverse interpolation, concentric interior force, physical force/moment, virtual work and direction reversal. |
| 2 Lumber | Independent virtual-work formulas, quarter-span oracle and displacement integrations. No constitutive defaults, capacities or sizing. |
| 3 Connector/source | `docs/references/usda-ppsa-frame-output-scope.md` and `tests/usda-ppsa-no-shear-diagnostic.test.mjs`: mixed formulation independently benchmarked with explicit assumptions and separate legacy comparison. No physical connector calibration. |
| 4 Geometry | `packages/analysis/src/elastic-frame-shear-uniform-load.ts`, `tests/elastic-frame-shear-uniform-load.test.mjs`: two explicit full-length uniform bases; independent quadrature shows equality of the uniform load vector to the Euler–Bernoulli integral for this bounded case only. |
| 5 Manufacturing | `tests/elastic-frame-shear-scope.test.mjs`: reject unsupported release, partial/eccentric/endpoint action and capacity input; preliminary/fabrication flags unchanged. |
| 6 Testing | `tests/elastic-frame-shear-member-action-benchmark.test.mjs`: independent cantilever rotations, deflections, reactions and end actions for interior force and uniform load. |
| Integration | `packages/analysis/src/elastic-frame-solve.ts`, `README.md`: physically check signed assembly and subtract the same local action RHS when recovering shear-flexible end actions. |

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Exact legacy USDA interpretation, structural design and fabrication remain held.

**Next:** Add explicit per-member released shear stiffness and RHS condensation with separately recovered private end rotations and independent propped-beam checks. Then decide whether any original deck/equation can explain the published discrepancy without tuning. Keep the 50-ft cap and fabrication locks.

## Batch 025 — 2026-11-22T02:48:21Z (UTC)

**Reviewed implementation:** [`8230d1789b236ef4e859626ee8072da2362f71db`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/8230d1789b236ef4e859626ee8072da2362f71db). Baseline `a81bbc3`: 462 passing. Full `npm run check`: **472 passed, 0 failed, 0 skipped**. Six independent lanes.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `packages/analysis/src/elastic-frame-shear-element.ts`, `tests/elastic-frame-shear-element.test.mjs`: independently grounded planar prismatic Timoshenko coefficients, explicit G and effective shear area, positive and limiting response cases. |
| 2 Lumber | Independent strain-energy, unit and constitutive-model audit. No implicit shear modulus, design value, capacity or lumber sizing. |
| 3 Connector/source | `docs/references/usda-ppsa-frame-output-scope.md`: distinguish fictitious-member shear flag, historical assumptions, model conventions and held source replay. No legacy coefficients adopted. |
| 4 Geometry | `packages/analysis/src/elastic-frame-global-element.ts`, `tests/elastic-frame-shear-global-element.test.mjs`: local/global orientation, potential energy equivalence and reversals. |
| 5 Manufacturing | `tests/elastic-frame-shear-scope.test.mjs`: fail closed on direct uniform or point loads, releases and added capacity claims on a shear-flexible member. |
| 6 Testing | `tests/elastic-frame-shear-benchmark.test.mjs`: independent inclined cantilever translations, rotations, reactions and local end actions; bounded mixed-load-path hand check. |
| Integration | `packages/analysis/src/elastic-frame-solve.ts`, `README.md`: explicitly selected rigid shear-flexible members retain per-member and nodal physical balance checks; no-shear member behavior stays available. |

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. This capability measures deflection under defined linear model assumptions, not actual wood properties or qualification.

**Next:** Develop and independently benchmark shear-consistent member action vectors and the corresponding recovery before separately enabling matched local end releases. The original USDA example is still held; maintain 50-ft span and fabrication locks.

## Batch 024 — 2026-11-22T02:34:02Z (UTC)

**Reviewed implementation:** [`594608f67cfd9497d28cef9bc94f4cf7b72b0a47`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/594608f67cfd9497d28cef9bc94f4cf7b72b0a47). Baseline `6f2b8e4`: 453 passing. Full `npm run check`: **462 passed, 0 failed, 0 skipped**. Six independent lanes.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `packages/analysis/src/elastic-frame-local-end-actions.ts`, `tests/elastic-frame-local-end-actions.test.mjs`: recover released section rotations from full equilibrium and correctly signed local node-on-member end vectors. |
| 2 Lumber | Independent end/section equilibrium audit and scoped shear-deformation oracle. End moments do not bound interior peaks; no structural design values or capacity assigned. |
| 3 Connector/source | `docs/references/usda-ppsa-frame-output-scope.md` and `tests/usda-ppsa-no-shear-diagnostic.test.mjs`: signed member 6 and 7 comparison, independent physical resultants, explicit no-shear versus legacy discrepancy. No physical connector demand or approval. |
| 4 Geometry | `tests/elastic-frame-recovered-topology.test.mjs`: mixed inclined shared joint, private rotations and exact ordered axes, joint balance and reversals. |
| 5 Manufacturing | `tests/elastic-frame-end-action-evidence-boundary.test.mjs`: same-member frame records cannot replace the separate connector evidence contract. No released manufacturing path. |
| 6 Testing | `tests/elastic-frame-recovered-end-benchmark.test.mjs`: analytic propped beam and interior-point cantilever local actions/rotations. |
| Integration | `packages/analysis/src/elastic-frame-solve.ts`, `README.md`: uncondensed local RHS retained for member recovery; independently check each physical member balance and all joint components before returning preliminary results. |

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. This is linear member-end verification only, not between-end demand, structural adequacy or capacity.

**Next:** Add an independently verified shear-flexible prismatic element using explicit shear modulus and effective shear area. Verify the nodal-load cantilever and local transform first; keep release/within-member shear load shapes held until separately supported. Original USDA result match remains held. Preserve 50-ft cap and fail-closed fabrication.

## Batch 023 — 2026-11-22T02:21:06Z (UTC)

**Reviewed implementation:** [`5622cef3dd393289145024c14c5c9bae3560ba25`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/5622cef3dd393289145024c14c5c9bae3560ba25). Baseline `977b09a`: 442 passing. Full `npm run check`: **453 passed, 0 failed, 0 skipped**. Six isolated lanes and an independent numerical diagnostic.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `packages/analysis/src/elastic-frame-release-load.ts`, `tests/elastic-frame-release-load.test.mjs`: Schur-reduced consistent applied RHS for ideal one/both end releases. Verified point and uniform resultants. |
| 2 Lumber | Method audit separated condensed actions, private member-end rotation, and between-end section demand. No sizing or verified lumber values changed. |
| 3 Connector/source | Independently transcribed public USDA source geometry, groups, loads, members and pins; `docs/references/usda-ppsa-frame-output-scope.md` documents exactly what's held. No physical plate fixity or capacity inferred. |
| 4 Geometry | `tests/elastic-frame-release-topology.test.mjs`: shared joint retains connected rotation, unconnected support rotation rejects, and missing real translational restraint remains a mechanism. |
| 5 Manufacturing | `tests/elastic-frame-ideal-release-capacity-boundary.test.mjs`: modeled releases do not accept inferred plate stiffness/capacity or enter fabrication. |
| 6 Testing | `tests/elastic-frame-release-benchmark.test.mjs`: analytical loaded fixed/prop and pin-pin cases; `tests/independent-bent-elastic-frame-benchmark.test.mjs` retains strict unsupported-field coverage. |
| Integration and independent comparison | `packages/analysis/src/elastic-frame-solve.ts`, `README.md`, `tests/usda-ppsa-no-shear-diagnostic.test.mjs`: exact per-member end releases, unconnected global rotations reported null, 50-ft cap, and full USDA example input geometry matches independent no-shear bearing resultants (not the original USDA output). |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Validation covers scoped software cases, not structural adequacy or approval.

**Next:** Recover private member-end rotations and local end actions from unreduced stiffness and applied RHS; verify them independently. Then add a separately benchmarked shear model. The legacy USDA discrepancy and node 2 display convention remain open. Keep fabrication locked.

## Batch 022 — 2026-11-22T02:05:41Z (UTC)

**Reviewed implementation:** [`d040c5c2191176ca7000f9d96c05bbc5a254f626`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/d040c5c2191176ca7000f9d96c05bbc5a254f626). Baseline `356ff9e`: 431 passing. Full `npm run check`: **442 passed, 0 failed, 0 skipped**. Six independent implementation, evidence and audit lanes.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `packages/analysis/src/elastic-frame-member-point-load.ts` and `tests/elastic-frame-member-point-load.test.mjs`: one concentric signed point force at a strict interior ordered station, virtual-work and end reversal checks. |
| 2 Lumber | Audited orthogonal support basis, normalization and numerical mechanism/force checks. No design values, member demands or sizing changed. |
| 3 Connector plates | `docs/references/usda-ppsa-frame-output-scope.md` and `tests/usda-ppsa-point-axis-witness.test.mjs`: source inputs, independent equilibrium and held legacy outputs only. No local end capacity or stiffness assigned. |
| 4 Geometry | `tests/elastic-frame-inclined-support-benchmark.test.mjs`: analytical signed reactions, axial/flexural movements, tangent reversal and unstable orientation. Integration adds simultaneous load and malformed input tests. |
| 5 Manufacturing | `tests/elastic-frame-release-boundary.test.mjs`: solved frame remains outside materials and release paths even under alleged verification and stale approval. No manufacturable output. |
| 6 Testing | `tests/elastic-frame-member-point-benchmark.test.mjs`: independent inclined cantilever with signed interior force and reversed ordered station; matches translations, rotations and reactions. |
| Integration | `packages/analysis/src/elastic-frame-solve.ts`, `README.md`: ideal signed support tangent with zero normal motion, local stability and residual checks, recovered global reactions; original physical actions are still balanced independently. Preserved 50-ft cap. |

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. No code compliance, bearing adequacy, structural approval or fabrication inferred from software results.

**Next:** Assemble explicit per-member end releases (not whole-joint hinges) with consistent load condensation and separate tests; then recover member local end/section forces. Shear formulation and full USDA analysis comparison remain held. Keep manufacturing fail-closed.

## Batch 021 — 2026-11-22T01:47:54Z (UTC)

**Reviewed implementation:** [`6b5c4c554b874dde8aa8ba8c7f52379abec5ed39`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/6b5c4c554b874dde8aa8ba8c7f52379abec5ed39). Baseline `4067f06`: 421 passing. Integrated `npm run check`: **431 passed, 0 failed, 0 skipped**. Six independent implementation, test and audit lanes. No release change.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `packages/analysis/src/elastic-frame-member-load.ts` and `tests/elastic-frame-member-load.test.mjs`: signed full-length uniform global force with explicit actual length or nonzero horizontal projection; independently computed midpoint physical resultant. |
| 2 Lumber | Audited projection math, extreme-range holds and absent section-force recovery. No sizing/design value change. |
| 3 Connector plates | Audited the USDA member releases and source gaps, recorded in `docs/references/usda-ppsa-frame-output-scope.md`. |
| 4 Geometry | `tests/elastic-frame-member-geometry.test.mjs`: inclined signed resultant and exact end reversal for both load bases. |
| 5 Manufacturing | Audited library isolation and fail-closed release. No shop, cut or machine output change. |
| 6 Testing | `tests/elastic-frame-member-load-benchmark.test.mjs`: independent deflections and reactions for uniform simple beam and inclined cantilever; added invalid-scope and mixed-action regressions at integration. |
| Integration | `packages/analysis/src/elastic-frame-solve.ts` and `README.md`: assemble optional uniform actions with nodal loads, check balance against physical actions, retain 50-ft guard. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. No member demand, licensed design or engineering approval inferred from those tests.

**Next:** separately implement inclined support restraints, rotational release assembly and point member loads with independent checks. Shear and member section-resultants remain unavailable; full USDA comparison and fabrication remain held.
