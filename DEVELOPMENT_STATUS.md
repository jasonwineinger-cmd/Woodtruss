# Woodtruss development status

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

## Batch 020 — 2026-11-22T01:34:47Z (UTC)

**Reviewed implementation:** [`88da003cd7e40265b3485697d2097130cd830b6c`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/88da003cd7e40265b3485697d2097130cd830b6c). Baseline `6523956`: 405 passing tests. Integrated `npm run check`: **421 passed, 0 failed, 0 skipped**. Six independent lanes; no change to fabrication release.

| Worker | Completed scope and changed code |
| --- | --- |
| 1 Structural | `packages/analysis/src/elastic-frame-global-element.ts`: rotates the directed prismatic local stiffness into global coordinates; retains rotational release flags at the element boundary. Checks inclined and vertical members and strain-energy invariance. |
| 2 Lumber | `packages/lumber/src/{centroidal-inertia-rotation,index}.ts`: rotates an independently supplied positive centroidal inertia tensor with signed cross term; no section inference, stiffness value assignment or adequacy. |
| 3 Connector plates | `packages/connections/src/plate-moment-rotation-witness.ts`: signed two-observation secant bound to the source and explicit end, axis and branch. No extrapolation, transferable design stiffness or capacity. |
| 4 Geometry | `packages/geometry/src/member-station.ts`: signed local member-axis station and offset, without snapping, clamping or inferring joint incidence. |
| 5 Physical/reference | `docs/references/usda-ppsa-frame-output-scope.md`: original Table VIII member-end coordinate/sign conversion and Table XII displacement display distinctions; holds the conflicting vertical-roller display semantics and shear/fixture differences. No USDA full-frame match. |
| 6 Testing | `tests/independent-bent-elastic-frame-benchmark.test.mjs`: independent Castigliano displacement/rotation, reactions and support-loss mechanism; additional scope and exact cap tests. |
| Integration | `packages/analysis/src/elastic-frame-solve.ts` and `README.md`: separate library-only prismatic rigid-ended frame solver for explicit nodal forces/couples and global component restraints. Diagonal-scaled solve, residual and global equilibrium checks, and 50-ft horizontal extent guard. |

**Other changed tests:** `tests/{elastic-frame-global-element,lumber-centroidal-inertia-rotation,member-station,plate-moment-rotation-witness}.test.mjs`.

**Independent checks:** mixed-orientation bent cantilever with heterogeneous axial/bending properties, exact cap and rejection of unsupported fields, numerical mechanism despite nominal restraint count, coordinate/energy invariance, and USDA printed reference sign/rounding documentation. The USDA case still requires assembled releases, inclined restraint and shear effects; no physical model or engineering authorization.

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Full independent model verification, licensed design values, site/code checks, and qualified review are still open.

**Next batch:** support consistent member load forces/couples, explicit frame boundary directions and/or released-end assembly separately, with analytic tests. Hold unsupported USDA scenarios and all manufacturing approval.

## Batch 019 — 2026-11-22T01:19:34Z (UTC)

**Reviewed implementation:** [`15927fba16d3b9fe41e6d0de99e317d194c028a9`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/15927fba16d3b9fe41e6d0de99e317d194c028a9). Baseline `888c57c`: 392 passing tests. Integrated `npm run check`: **405 passed, 0 failed, 0 skipped**. Six independent lanes. No change to fabrication release.

| Worker | Completed scope and changed code |
| --- | --- |
| 1 Structural | `packages/analysis/src/elastic-frame-element.ts`: independent local axial and Euler–Bernoulli bending stiffness, with explicit zero-moment end releases. No shear deformation, global frame assembly or solved structural response. |
| 2 Lumber | `packages/lumber/src/{rectangular-planar-elastic-properties,index}.ts`: separates gross geometry, perpendicular bending axis and explicitly supplied effective shear area/modulus. No default shear factor or approved material values. |
| 3 Connector plates | `packages/connections/src/plate-member-end-release.ts`: bind two directed member-end rotational declarations to independently expected source locations; unknown stays held. No physical fixity or transferable connector stiffness inferred. |
| 4 Geometry | `packages/geometry/src/inclined-support-axis.ts`: explicitly authored signed free and constrained direction mapped between local and global coordinates. No restraint or bearing approval. |
| 5 Physical/reference | `docs/references/usda-ppsa-example-scope.md`: independent primary source review of coordinate, load and reaction tables and local member sign check. This is a historical worked frame calculation, not a physical load test. |
| 6 Testing | Independently reread the printed tables and Figure 5. The published case is consistent with horizontal projection, but the input format does not name the basis; no universal rule was inferred. |
| Integration | `packages/analysis/src/planar-load-resultant.ts` and `tests/published-usda-ppsa-statics.test.mjs`: compare explicit length bases while preserving points and applied couples. The example closes global force/moment and does not solve USDA's member actions, movements or support compatibility. |

**Other changed tests:** `tests/{elastic-frame-element,inclined-support-axis,lumber-rectangular-planar-elastic-properties,plate-member-end-release}.test.mjs`.

**Independent checks:** published USDA load/resultant and reported reaction balance; endpoint reversal and reference-origin effects; synthetic axial/bending cantilever stiffness, released ends, orthogonal section properties and signed inclined geometry. Real lumber, connectors and fabrication remain unverified.

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Missing site/code input verification, licensed capacities, engineering signoff and manufacturing checks remain open.

**Next batch:** coordinate transforms, consistent member-to-node force vectors and independently checked global frame assembly are separate next steps. Preserve distinction between Euler–Bernoulli element and USDA frame with shear deformation. No structural result is fabrication authority.

## Batch 018 — 2026-11-22T01:03:58Z (UTC)

**Reviewed implementation:** [`f02a6b80917f7b748ff9bfbea8c30e69010290e6`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/f02a6b80917f7b748ff9bfbea8c30e69010290e6). Baseline `50e3f78`: 378 passing tests. Integrated `npm run check`: **392 passed, 0 failed, 0 skipped**. Six independent lanes. No change to fabrication release.

| Worker | Completed scope and changed code |
| --- | --- |
| 1 Structural | `packages/analysis/src/symmetric-beam-deflection-benchmark.ts`: independent named-station Euler–Bernoulli solution for a level, isolated prismatic simple span under a centered point force. Does not add bending stiffness or load transfer to truss results. |
| 2 Lumber | `packages/lumber/src/{repeated-axial-secants,index}.ts`: measured signed secants and scatter over an explicitly shared specimen, datum, and force window. No modulus design value, calibrated independence or capacity. |
| 3 Connector plates | `packages/connections/src/plate-load-slip-observation.ts`: exact observation/axis/source binding with measured matching force stations on load/unload and residuals; no inferred reversibility, transferable stiffness or strength. |
| 4 Geometry | `packages/geometry/src/measurement-stations.ts`: locate authored gages along an explicit bearing axis with signed transverse offset; report shared/bracketing stations without treating them as nodes, interpolating movements, or claiming datum alignment. |
| 5 Physical reference | `docs/references/usda-fpl492-6m3-evidence.md`: isolate one measured 28-ft timber specimen and distinguish the reported stiffness from assembly columns, raw gage displacements, and its companion report’s different fixture. No drawing bundled or model match asserted. |
| 6 Testing | `tests/published-ju-pin-jointed-benchmark.test.mjs`: published independent ideal truss calculation reproduced for signed forces, displacements and roller reaction; independently derived pin reactions and a missing-roller mechanism check. |
| Integration | `README.md`: distinguishes a public numerical regression, a physical test candidate and the separate beam solution from approved structural design. |

**Other changed tests:** `tests/{lumber-repeated-axial-secants,measurement-stations,plate-load-slip-observation,symmetric-beam-deflection-benchmark}.test.mjs`.

**Independent checks:** published ideal truss response, analytic center/quarter/support beam displacements, measured-secant scope rejection, load versus unload residuals, signed bearing-axis geometry and the exact 50-ft maximum. A real truss or an assembly remains unverified by these checks.

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Independent matching physical inputs, missing code/licensed data, engineering and manufacturing approval remain open.

**Next batch:** strengthen physical and modeled reference scope matching and exact gage comparison without filling published gaps, and continue independent bench verification. The current axial truss solver does not represent the physical fixture or connection slip.

## Batch 017 — 2026-11-22T00:48:43Z (UTC)

**Reviewed implementation:** [`b417d502eb39fd8d958651494a4ef2454442430b`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/b417d502eb39fd8d958651494a4ef2454442430b). Baseline `e365cb3`: 366 passing tests. Integrated `npm run check`: **378 passed, 0 failed, 0 skipped**. Six lanes, including one separate read-only scope review. All repository fixtures are synthetic.

| Worker | Completed scope and changed code |
| --- | --- |
| 1 Structural | `packages/analysis/src/authored-model-analysis.ts`: strict explicit units, named cases and member incidence, explicit area and modulus per bar, level pin-and-roller bearings spanning 8–50 ft, numerical stability and equilibrium checks. No geometry or load inference. |
| 2 Lumber | `packages/lumber/src/{member-stiffness-assignment-audit,index}.ts`: exact member/model revision and catalog receipt checks for proposed solver inputs, separate mean/minimum modulus basis and missing or stale records. No material or capacity approval. |
| 3 Connector plates | `packages/connections/src/plate-schedule-geometry.ts`: separate actual projected-outline witness for each scheduled joint, face and axis, even if a schematic callout repeats. No dimensional inference or approved plate placement. |
| 4 Geometry | `packages/geometry/src/raised-heel-double-fink-topology.ts`: bounded generic symmetric centerline geometry, level bearings, independent heel nodes, triangulated roof and end bays. No structural solve or manufactured layout. |
| 5 Review/transfer | Read-only review of reference-data completeness; an output envelope is not a complete graph, coincident load case or connection model. No code or outside documents added in this lane. |
| 6 Testing | `tests/independent-heterogeneous-three-path-benchmark.test.mjs`: independent force, reaction and displacement calculations for redundant bars with unequal stiffness; removal changes the sign of one axial force while leaving the model stable. |
| Integration | `scripts/preview.mjs`, `README.md`, `tests/cli-smoke.test.mjs`: `--authored-model` accepts one bounded explicit JSON model through stdin, rejects unsupported input with no result, labels all outputs not for fabrication; sample equilibrium checked independently. |

**Other changed tests:** `tests/{authored-model-analysis,lumber-member-stiffness-assignment-audit,plate-schedule-geometry,raised-heel-double-fink-topology}.test.mjs`.

**Independent checks:** analytic translated triangle with heterogeneous bars, unsupported/singular input, exact cap, stable loss of one redundant stiffness path, planar geometric face coverage, stale stiffness and plate bindings. This is software verification, not project design approval.

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Full independent project validation, site/code loads, licensed capacities, professional review and integrated shop validation remain open.

**Next batch:** make independently specified case and reference evidence easier to capture without relaxing the provenance or safety gates. Do not equate the generic raised-heel centerlines with a supplied design or use force envelopes as one simultaneous load case.

## Batch 016 — 2026-11-22T00:35:01Z (UTC)

**Reviewed implementation:** [`4dbadf810505e58bfc4112ee8f7a615cd52c58e9`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/4dbadf810505e58bfc4112ee8f7a615cd52c58e9). Baseline `2dc41ef`: 348 passing tests. Integrated `npm run check`: **366 passed, 0 failed, 0 skipped**. Six isolated workers. All examples are synthetic and review-only.

| Worker | Completed scope and changed code |
| --- | --- |
| 1 Structural | `packages/analysis/src/authored-case-benchmark.ts`: exact model/case/receipt replay before comparing independently supplied signed numerical targets and tolerances. Missing or unsupported quantities remain held rather than treated as comparisons. |
| 2 Lumber | `packages/lumber/src/{axial-observation-reconciliation,index}.ts`: signed axial displacement comparison against a separately stated length, area and modulus; exact datum, no fitting or material qualification. |
| 3 Connector plates | `packages/connections/src/plate-schedule-evidence.ts`: reconciles exact source revision, drawing callout, part designation, face and observed dimensions; refuses unsupported capacity fields or missing rows. |
| 4 Geometry | `packages/geometry/src/double-fink-topology.ts`: independent symmetric eight-panel double-Fink-style centerline reference; planar check, explicit supported geometry and 50-ft limit, no manufacturer layout or analysis. |
| 5 Manufacturing | `packages/fabrication/src/preliminary-review-artifact.ts`: detached versioned byte-length/SHA manifest for the existing review-only handoff. Byte integrity does not substitute for source/case/scope checks or release. |
| 6 Testing | `tests/independent-mixed-chord-line-load-benchmark.test.mjs`: independent translated mixed roof/bottom load moments and bearing reactions, and rejects a station beyond the shorter projected path. |
| Integration | `packages/analysis/src/projected-bearing-statics.ts`: direct two-bearing equilibrium for explicitly signed projected pressure strips, independent of stiffness; `scripts/preview.mjs` and `README.md` expose geometry-only `--double-fink-reference`. |

**Other changed tests:** `tests/{authored-case-benchmark,cli-smoke,double-fink-topology,lumber-axial-observation-reconciliation,plate-schedule-evidence,preliminary-review-artifact,projected-bearing-statics}.test.mjs`.

**Independent checks:** signed projected-strip force and moment, exact 50-ft cap, explicitly modeled axial witness, planar graph triangulation and no crossings, mixed load path station limits, and a matching checksum that still cannot legitimize an unacceptable handoff. These are engineering software checks, not independently approved structural designs.

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. No site-specific verification, licensed sizing inputs, qualified design approval, or production integration.

**Next batch:** advance explicit model and exact benchmark inputs separately from generic sketches. More detailed comparison requires the actual graph, load cases and assumptions, not merely matching overall statics or a family name. Do not infer missing licensed values or approval.

## Batch 015 — 2026-11-22T00:19:03Z (UTC)

**Reviewed implementation:** [`a31d9814d3311b6e414bdd683e46207487cce5a5`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/a31d9814d3311b6e414bdd683e46207487cce5a5). Baseline `92f3b55`: 331 passing tests. Integrated `npm run check`: **348 passed, 0 failed, 0 skipped**. Six isolated workers; no release changes.

| Worker | Completed scope and changed code |
| --- | --- |
| 1 Structural | `packages/analysis/src/member-chain-line-load.ts`: explicit connected modeled bars and partial cumulative chain interval, linear signed global intensity, exact equivalent node forces. No implied transverse behavior or physical load application. |
| 2 Lumber | `packages/lumber/src/{rectangular-net-section,index}.ts`: subtract explicit disjoint rectangles and return net area, centroid, and inertias, including signed product. No stress concentration, actual continuity, NDS values or capacity. |
| 3 Connector plates | `packages/connections/src/plate-outline-conflict.ts`: distinguish disjoint outlines, boundary contact, and overlap within the same verified local face. No spacing rule, plate sizing, acceptable placement, or strength. |
| 4 Geometry | `packages/analysis/src/explicit-family-dispatch.ts`: adds the limited agricultural tied-gable point-load route. It requires the agricultural family and rejects raised heel, overhang and unsupported purlin options. |
| 5 Manufacturing | `packages/fabrication/src/preliminary-review-wire.ts`: canonical standalone UTF-8 handoff carrying only review identity and verification digests; replays trusted independent scope; rejects malformed or stale inputs. Its 600-in cap is a schematic extent, not bearing span. |
| 6 Testing | `tests/independent-shallow-compliance-benchmark.test.mjs`: closed-form compression, reactions and displacement for a shallow V, including transposed coordinates and rejection of a numerically unreliable near-mechanism. |
| Integration | `scripts/preview.mjs`, `README.md`, `tests/cli-smoke.test.mjs`: new versioned JSON input on standard input, explicitly signed point loads, reported movements/reactions/axial forces and audited equilibrium; no fabricated or default project inputs. |

**Other changed tests:** `tests/{explicit-family-dispatch,lumber-rectangular-net-section,member-chain-line-load,plate-outline-conflict,preliminary-review-wire}.test.mjs`.

**Independent checks:** hand force and moment for partial member-chain loading, rectangular net section properties, polygon separating cases, signed agricultural case reactions and exact 50-ft boundary, shallow closed-form compliance, and canonical-byte negative fixtures. These are software/numerical checks, not an independent engineering approval.

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Verified site load ownership/conditions, adopted code checks, licensed design values, integrated manufacturing workflow and qualified approval are not complete.

**Next batch:** improve authored study usability and exact source provenance, extend only supported geometry with independent validation, and keep material, connector, optimization and fabrication gates closed until their missing inputs and independent verification are supplied. Attic remains geometry-only; hip remains a roof geometry reference, not an analyzed hip truss.

## Batch 014 — 2026-11-22T00:03:11Z (UTC)

**Reviewed implementation:** [`672da18388fa56fbd466224ea5e5df19948dd173`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/672da18388fa56fbd466224ea5e5df19948dd173). Baseline `718a120`: 315 passing tests. Integrated `npm run check`: **331 passed, 0 failed, 0 skipped**. Six isolated workers; outputs remain preliminary.

| Worker | Completed scope and changed code |
| --- | --- |
| 1 Structural | `packages/analysis/src/serviceability-revision-comparison.ts`: independently mapped authored cases and exact replay across revisions, with signed delta only for matching geometry, datums and restraints. Different geometry shows separate measurements without physical continuity or code criteria. |
| 2 Lumber | `packages/lumber/src/{built-up-rectangular-geometry,index}.ts`: separate centroidal inertias versus ideally combined homogeneous geometry for explicit nonoverlapping rectangles. No installed composite action, member capacity or ranking. |
| 3 Connector plates | `packages/connections/src/plate-face-mirror-review.ts`: independent same-joint front/back faces compared only under an explicitly supplied reflection transform. No inferred placement, installed registration, usable grip or capacity. |
| 4 Geometry | `packages/geometry/src/attic-clearance-study.ts`: compares explicit span/pitch choices against fixed room and ridge limits, retaining failures and nondominated geometry-only options. No framing stability or floor design. |
| 5 Manufacturing | `packages/fabrication/src/preliminary-member-review-handback.ts`: exact two-revision trace with pending and acknowledged checklist state, rejects substituted data; no physical continuity, fabrication or approval. |
| 6 Testing | `tests/independent-dimensional-scaling-benchmark.test.mjs`: forces/reactions invariant and displacement scales with length at fixed EA; loss of horizontal restraint is rejected at every test scale. |
| Integration | `scripts/preview.mjs`, `README.md`, `tests/cli-smoke.test.mjs`: `--attic-clearance` requires four explicit geometry inputs, emits a labeled not-for-fabrication clearance report and rejects analysis or SVG requests for this mode. |

**Other changed tests:** `tests/{attic-clearance-study,independent-dimensional-scaling-benchmark,lumber-built-up-rectangular-geometry,plate-face-mirror-review,preliminary-member-review-handback,serviceability-revision-comparison}.test.mjs`.

**Independent checks:** ideal attic section options and 50-ft guard; hand check of a 36-ft geometric minimum in the CLI example, signed displacement under stiffness change, geometric inertias, explicitly reflected asymmetric outline, and analytic dimensional scaling. None is engineering approval.

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. No verified site loads, licensed design tables, installed structure, manufacturing integration or approval.

**Next batch:** continue bounded geometry and authored-case verification, distinguish unresolved attic structural stability/floor design from clearance, and keep all review and fabrication outputs fail-closed. Source-approved material, connector, code and professional approval gates remain open.

## Batch 013 — 2026-11-21T23:48:30Z (UTC)

**Reviewed implementation:** [`c3172d34da3d9e0d7bbb734d8a235c91319a27ee`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/c3172d34da3d9e0d7bbb734d8a235c91319a27ee). Baseline `6263544`: 301 passing tests. Integrated `npm run check`: **315 passed, 0 failed, 0 skipped**. Six isolated workers; all engineering outputs preliminary.

| Worker | Completed scope and changed code |
| --- | --- |
| 1 Structural | `packages/analysis/src/authored-serviceability-replay.ts`: exact independently expected model/revision/cases replay signed relative movement against explicit modeled bearings. Untrusted solver outputs are not used; no code deflection criteria. |
| 2 Lumber | `packages/lumber/src/{stepped-axial-deformation,index}.ts`: explicit ordered segments under one signed force, with continuous ideal axial deformation, compliance and elastic energy. No grade, capacity, connection or selection. |
| 3 Connector plates | `packages/connections/src/plate-footprint-revision-review.ts`: exact two-revision, same-face local outline margins; gap comparison is held unless projected member scope and evidence agree. No grip, capacity or acceptable plate location. |
| 4 Geometry | `packages/geometry/src/attic-clearance-limits.ts`: explicit centerline width/height/margin limits and minimum feasible span, preserves infeasible requests and exact 50-ft boundary. No floor structure, concealed brace or stability solve. |
| 5 Manufacturing | `packages/fabrication/src/preliminary-member-trace.ts`: independently replays two schematic revisions and compares exact selected IDs and endpoint changes. Equal ID or length can mask movement; physical reuse/continuity is never granted. |
| 6 Testing | `tests/independent-raised-chord-benchmark.test.mjs`: hand force, moment and virtual-work displacement check, plus missing vertical tie mechanism. |
| Integration | CLI capabilities identify attic as centerline-clearance only and analysis unavailable. |

**Other changed tests:** `tests/{attic-clearance-limits,authored-serviceability-replay,cli-smoke,lumber-stepped-axial-deformation,plate-footprint-revision-review,preliminary-member-trace}.test.mjs`.

**Independent checks:** attic geometric extrema at the exact span cap, signed relative deflection and raised-chord work, stepped member deformation energy, rotated outline deltas, and exact two-revision replay negatives. These are numerical/software checks, not engineering approvals.

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Licensed inputs, code validation and qualified project signoff remain open.

**Next batch:** expose an explicitly labeled geometry-only attic study if useful; preserve open stability and floor-design holds. Advance independently checked demand and traceability diagnostics without inferring licensed values, placement, or release. The 50-ft maximum and preliminary fabrication hold remain.

## Batch 012 — 2026-11-21T23:33:20Z (UTC)

**Reviewed implementation:** [`3bbc257014b86447fe7c82c9e30c1e355293cbde`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/3bbc257014b86447fe7c82c9e30c1e355293cbde). Baseline `a7fd011`: 287 passing tests. Integrated `npm run check`: **301 passed, 0 failed, 0 skipped**. Six isolated workers, all engineering outputs remain preliminary.

| Worker | Completed scope and changed code |
| --- | --- |
| 1 Structural | `packages/analysis/src/support-vertical-demand.ts`: replays exact authored cases and restrained supports; separates compression from required hold-down, preserves signed extrema and ties. No anchor, contact, capacity or site design. |
| 2 Lumber | `packages/lumber/src/{rectangular-eccentric-axial,index}.ts`: explicit axial force and two eccentricities yield signed first-order moments and corner stresses. No load introduction, connection behavior, second-order or allowable checks. |
| 3 Connector plates | `packages/connections/src/plate-projected-gaps.ts`: geometric uncovered area only when every exact projected member is present, same face and nonoverlapping and the plate is in-face. Does not infer usable area, grip, design or placement. |
| 4 Geometry | `packages/analysis/src/scissor-explicit-analysis.ts`: narrow level-bearing pin-jointed scissor study under explicit signed joint loads. Audits global/local equilibrium and holds unsupported cases; attic stability remains held. |
| 5 Manufacturing | `packages/fabrication/src/preliminary-review-closure.ts`: paired revision evidence and exact receipt replay distinguish pending, acknowledged, and empty reviews. None is approval or verified identity. |
| 6 Testing | `tests/independent-self-equilibrated-load-benchmark.test.mjs`: zero net force and moment still produce internal compression and displacement; missing load path rejects. |
| Integration | Exposed `scissor-level` in `packages/analysis/src/explicit-family-dispatch.ts`; assertions distinguish its exact 50-ft limit and selection from both existing CLI demo families. |

**Other changed tests:** `tests/{cli-smoke,explicit-family-dispatch,lumber-rectangular-eccentric-axial,plate-projected-gaps,preliminary-review-closure,scissor-explicit-analysis,support-vertical-demand}.test.mjs`.

**Independent checks:** signed compression/uplift reactions, scissor moment arm and 50-ft cap, rectangle stress resultant recovery, self-equilibrated closed-form deflection and mechanism falsification, and exact measured geometry/evidence rejection. These are synthetic numerical and software checks, not code compliance or qualified engineering verification.

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Licensed lumber/plate capacities, adopted project/site loads, independent review and safe production remain open.

**Next batch:** broaden limited, explicitly supported families or preserve honest holds; connect trusted review-only case/result and serviceability evidence, and improve CLI/documentation only when inputs are independently checked. Do not infer attic stability, approved plate/member sizing or manufacturing authority.

## Batch 011 — 2026-11-21T23:18:48Z (UTC)

**Reviewed implementation:** [`d500e9502b1de962c7f034c051f930fbc1c371d1`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/d500e9502b1de962c7f034c051f930fbc1c371d1). Baseline `e53ea9a`: 271 passing tests. Integrated `npm run check`: **287 passed, 0 failed, 0 skipped**. Six isolated workers; all outputs remain preliminary.

| Worker | Completed scope and changed code |
| --- | --- |
| 1 Structural | `packages/analysis/src/receiving-reaction-envelope.ts`: verifies exact independent case coverage and one receiving revision; preserves signed extrema, ties and provenance from replayed separate-model cases. No invented cases, factors, coupled solve or capacity. |
| 2 Lumber | `packages/lumber/src/{rectangular-longitudinal-strain,index}.ts`: signed longitudinal strains and separate biaxial gradients from an explicitly uniform modulus. Does not set material values, allowable strain or adequacy. |
| 3 Connector plates | `packages/connections/src/plate-coverage-conflicts.ts`: pairwise overlapping projected member area clipped inside the given plate is held separately from no contact and unresolved input. Never sums pairwise areas or infers usable grip, plate strength or placement. |
| 4 Geometry | `packages/analysis/src/explicit-family-dispatch.ts`: explicitly dispatches level common, asymmetric common, raised-heel common and level mono point-load studies only. Rejects unknown variants and invalid options rather than falling back. This is not the list of all engine entry points or complete engineering capabilities. |
| 5 Manufacturing | `packages/fabrication/src/preliminary-review-invalidation.ts`: exactly verified prior receipt and next checklist; all current items need fresh acknowledgment, even when the IDs and normalized drawing match. No sign-off or inherited approval. |
| 6 Testing | `tests/independent-redundant-axial-restraint-benchmark.test.mjs`: verifies the stiffness-dependent force split and its change when one axial restraint is freed. |
| Integration | `scripts/preview.mjs`, `README.md`, `tests/cli-smoke.test.mjs`: `--capabilities` lists the exact CLI demo options separately from library-only point-load variants, and repeats the release hold. |

**Other changed tests:** `tests/{explicit-family-dispatch,lumber-rectangular-longitudinal-strain,plate-coverage-conflicts,preliminary-review-invalidation,receiving-reaction-envelope}.test.mjs`.

**Independent checks:** signed bearing extrema and tie attribution, hand-derived strain-field resultants and restraint-dependent load sharing, exact projected overlap conflicts, hand-equilibrium reactions and 50 ft boundary for each route. These are synthetic numerical/software checks, not structural approval.

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Licensed inputs, reviewed site load cases and verified capacity/production workflows are still missing.

**Next batch:** build useful explicit scoped dispatch and bench cases, bind review-only serviceability and revision records where needed, and continue verified inputs without guessing material or plate capacities. Keep the 50-foot maximum and fail-closed release.

## Batch 010 — 2026-11-21T23:03:09Z (UTC)

**Reviewed implementation:** [`a800268be82af1c7aa81684eaa356097b4008d11`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/a800268be82af1c7aa81684eaa356097b4008d11). Baseline `8622670`: 257 passing tests. Integrated `npm run check`: **271 passed, 0 failed, 0 skipped**. Six isolated workers; all outputs remain preliminary.

| Worker | Completed scope and changed code |
| --- | --- |
| 1 Structural | `packages/analysis/src/receiving-girder-case.ts`: separately expected receiving model/revision and explicit carried source-case mapping, ownership and bearing reaction replay, then a globally and locally checked receiving solve. No implicit loads or horizontal/coupled transfer. |
| 2 Lumber | `packages/lumber/src/{rectangular-section-shear,index}.ts`: explicit signed shear resultants give separate rectangular-section parabolic stress profiles. No capacity, torsion, combined checks or design rules. |
| 3 Connector plates | `packages/connections/src/plate-member-overlap-review.ts`: computes independent convex projected intersections in an exact local frame, distinguishing zero overlap from missing or stale evidence. Does not add overlapping polygons or infer usable grip, placement or strength. |
| 4 Geometry | `packages/analysis/src/raised-heel-common-analysis.ts`: preliminary solve for one symmetric level-bearing raised-heel topology, with uniform illustrative stiffness, authored point loads and equilibrium checks. Independent triangulation proof for the scoped graph; not a connection/bearing detail. |
| 5 Manufacturing | `packages/fabrication/src/preliminary-review-receipt.ts`: binds offline self-attested acknowledgments to exact independently verified checklist scope, digest and item IDs. Tracks pending items separately without approval or fabricated reviewer authentication. |
| 6 Testing | `tests/independent-split-nodal-load-benchmark.test.mjs`: verifies that split load entries preserve the signed forces and displacements; held-axis direct loads change only reactions. |
| Integration | Updated engineering roadmap for the two narrow level-bearing common variants and the non-coupled girder receiving study. |

**Other changed tests:** `tests/{lumber-rectangular-section-shear,plate-member-overlap-review,preliminary-review-receipt,raised-heel-common-analysis,receiving-girder-case}.test.mjs`.

**Independent checks:** two-model internal action/reaction cancellation and 180 lb total external reaction; raised-heel moment arm and analytical triangulation; integrated shear profile reproducing input signed force; convex projection areas; split-load hand statics/compatibility; stale and extra release fields excluded. These do not establish structural capacity or code compliance.

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Licensed design values, site/adopted inputs, production review and qualified approvals still open.

**Next batch:** consolidate supported geometry-and-solver capability checks so previews cannot imply unsupported behavior; extend source/revision load traceability and appropriate synthetic mechanics only where independently checked; keep the plate and manufacturing lanes fail-closed. The 50-foot maximum and production hold remain.

## Batch 009 — 2026-11-21T22:48:09Z (UTC)

**Reviewed implementation:** [`9f22006e4f03602992be27fd5c80865adb748c49`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/9f22006e4f03602992be27fd5c80865adb748c49). Baseline `39b13aa`: 242 passing tests. Integrated `npm run check`: **257 passed, 0 failed, 0 skipped**. Six isolated workers; all outputs remain preliminary.

| Worker | Completed scope and changed code |
| --- | --- |
| 1 Structural | `packages/analysis/src/carried-bearing-transfer.ts`: validates independent source-patch ownership before replaying the named source case/revision. Checks that the selected restrained bearing's vertical reaction has the exact opposite sign and magnitude at the receiving girder station; blocks reusing a full source bearing. Horizontal transfer, loaded areas, bearing adequacy and attachment remain held. |
| 2 Lumber | `packages/lumber/src/{rectangular-section-mechanics,index}.ts`: calculates centered section properties and separates explicit axial and two-axis bending stress for all four corners. No strength limits, code factors, buckling, or selection. |
| 3 Connector plates | `packages/connections/src/plate-footprint-review.ts`: compares a supplied convex outline with explicit rectangular face coordinates and reports signed geometric clearances/touch/protrusion in the exact frame. Not plate placement, required edge distance, capacity or grip. |
| 4 Geometry | `packages/geometry/src/raised-heel-common-topology.ts`: level-bearing symmetric raised-heel schematic, with separate top and bottom heel nodes and 50-ft maximum; unsupported offsets and degenerate inputs are held. No solver, connection detail or fabrication. |
| 5 Manufacturing | `packages/fabrication/src/preliminary-review-checklist.ts`: versioned review checklist from exactly replayed comparison; preserves digests, affected IDs and review-only exclusions, including a flag when the normalized view looks unchanged despite geometry changes. No drawing, stock, cuts or machine data. |
| 6 Testing | `tests/independent-uplift-reaction-benchmark.test.mjs`: independent force, moment and displacement under signed horizontal-plus-upward loading, with artificial rotational restraint removal as a negative test. |
| Integration | `ENGINEERING_ROADMAP.md`: aligns current supported scopes and unfinished gates with the implementation without claiming structural or production readiness. |

**Other changed tests:** `tests/{carried-bearing-transfer,lumber-rectangular-section-mechanics,plate-footprint-review,preliminary-review-checklist,raised-heel-common-topology}.test.mjs`.

**Independent checks:** synthetic vertical reaction transfer in both signs without rounding, four-corner stress and moduli calculated by hand, rotated outline distances, symmetric heel elevations/end triangles, uplift reaction and mechanism falsification, and modified review record rejection. These are numerical/software checks, not engineering approvals.

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. No new licensed inputs, qualified engineering sign-off, or finished operational gate.

**Next batch:** clarify exact load-case mappings and independence at supported transfers, build on independently verified section mechanics without inventing allowable stresses, and expand valid schematic/analysis capabilities or review acceptance only with scoped guarantees. The 50-foot cap, independently qualified engineering review and trusted release requirements remain.

## Batch 008 — 2026-11-21T22:33:40Z (UTC)

**Reviewed implementation:** [`d270b04621b7d839f433b2f408546a1a67a8d58c`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/d270b04621b7d839f433b2f408546a1a67a8d58c). Baseline `3f24f9c`: 225 passing tests. Integrated `npm run check`: **242 passed, 0 failed, 0 skipped**. Six isolated worker lanes plus integration. All work remains preliminary and not for fabrication.

| Worker | Completed scope and changed code |
| --- | --- |
| 1 Structural | `packages/analysis/src/girder-source-patch-ownership.ts`: requires independent expected case, girder, source patch, joint station, face and direct/carried route. Rejects the same patch counted twice before aggregation. Does not detect unmarked spatial overlap, verify a carried reaction or derive any load. |
| 2 Lumber | `packages/lumber/src/{publication-byte-evidence,index}.ts`: checks exact local Supplement/addendum artifacts against independently expected hashes and edition/quantity receipts. It neither transmits nor validates licensing or values. |
| 3 Connector plates | `packages/connections/src/plate-artifact-joint-review.ts`: exact authorized local article bytes, product/use metadata, joint and replayed cases must agree for a review-only result. Manufacturer applicability and capacity remain held even when records match. |
| 4 Geometry | `packages/analysis/src/asymmetric-common-analysis.ts`: audited narrow two-pitch gable analysis with level end pin/roller and explicit signed points; rejects over span, raised heels, overhangs and invalid models. No actual bearing, code load, connection or material verification. |
| 5 Manufacturing | `packages/fabrication/src/preliminary-schematic-comparison.ts`: two same-design revision SVGs are replayed against independently expected inputs. Identical normalized viewports are distinguished from identical model geometry. No cuts, shop drawings, production Panelizer or release. |
| 6 Testing | `tests/independent-offcenter-gable-benchmark.test.mjs`: method-of-joints check of all nine forces, support equilibrium, virtual-work deflection and mechanism rejection with unchanged outer outline. |
| Integration | `scripts/preview.mjs`, `tests/cli-smoke.test.mjs`, `README.md`: optional normalized SVG view of the common or mono synthetic model, visibly stamped NOT FOR FABRICATION, with no real-world dimensions. JSON remains default. |

**Other changed tests:** `tests/{asymmetric-common-analysis,girder-source-patch-ownership,lumber-publication-byte-evidence,plate-artifact-joint-review,preliminary-schematic-comparison}.test.mjs`.

**Independent checks:** authored distinct synthetic 60 lb + 60 lb point contributions on a 12 ft girder reference produce 80/40 lb reactions. Adding the duplicate would still balance at 120/60 lb but is rejected by the patch-identity guard. [SBCA's Figure 2](https://www.sbcacomponents.com/media/understand-the-space-between) documents the overlap failure mode; this implementation does not embed its geometry or assume any correction method. Also verified mirrored two-pitch force/moment response, virtual work and repeated-SVG/changed-model comparison. None is qualified engineering approval.

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Better analysis and review aids do not close any major design, sourcing, or production gate.

**Next batch:** bind an authored carried force to an independently replayed exact support/case and keep the source ownership guard; reject ambiguous physical transfer instead of guessing. Continue edition/licensed material and plate use evidence without values or assumptions, and extend bounded geometry/review tooling without removing any production hold. No field, site or manufacturer data verified and no engineering or manufacturing approval.

## Batch 007 — 2026-11-21T22:19:16Z (UTC)

**Reviewed implementation:** [`8ba76af3b800acd8474643eaf2905bad08306ec6`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/8ba76af3b800acd8474643eaf2905bad08306ec6). Baseline `fcc7d02` had 209 passing tests. Integrated `npm run check`: **225 passed, 0 failed, 0 skipped**. Six isolated workers plus integration. Preliminary and not for fabrication.

| Worker | Completed scope and changed code |
| --- | --- |
| 1 Structural | `packages/analysis/src/relative-joint-serviceability.ts`: checks the explicitly expected solved case IDs and compatible models, reports signed joint-Y movement relative to the modeled bearing-datum line at the original station; optional user-only threshold. No code deflection limit, slip, creep or bending. |
| 2 Lumber | `packages/lumber/src/{reference-quantity-intake,index}.ts`: ties six catalog quantities to exact grade, product dimensions, edition/Supplement/addenda, reviewer axis basis and psi receipt. Existing values are checked against receipts, not authenticated or authorized for design; no tables distributed. |
| 3 Connector plates | `packages/connections/src/plate-source-artifact.ts`: matches caller-authorized local bytes to exact independently expected maker document, product, family, revision, scope and SHA-256. No origin authentication, report interpretation or plate capacity. |
| 4 Geometry | `packages/geometry/src/asymmetric-common-topology.ts`: unequal pitches meet at one calculated ridge with level end bearings, mirrored and equal-pitch controls, and 50-ft cap. Reference centerline graph only, not an approved truss or solver path. |
| 5 Manufacturing | `packages/fabrication/src/preliminary-schematic-review.ts`: builds a revision-bound, stamped, dimensionless normalized SVG from independently expected frozen evidence; replays before exposing it and rejects changed or rehashed markup. No fabrication/stock/machine data or active integration. |
| 6 Testing | `tests/independent-series-axial-benchmark.test.mjs`: independent cut forces, relative elongations, and transverse zero-mode falsification for unequal lengths and stiffnesses. |
| Integration | `scripts/preview.mjs`, `README.md`, `tests/cli-smoke.test.mjs`: a separate fixed illustrative mono-pitch example, with an explicit quarter-point point load and independent 750/250 lb expected reactions. Common example remains default; no user/site design loads or releases. |

**Additional tests:** `tests/{asymmetric-common-topology,lumber-reference-quantity-intake,plate-source-artifact,preliminary-schematic-review,relative-joint-serviceability}.test.mjs`.

**Independent checks:** virtual-work relative Y, moving datum interpolation and fixed-datum falsification; two-slope ridge coordinates; synthetic axial series displacements and stability; exact artifact identity and unchanged preview holds. No structural design or code compliance verified.

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. These are preliminary improvements. No new licensed data, code design workflow, production export, or qualified review has closed a major gate.

**Next batch:** independently verify the industry reference and test duplicate source-area ownership on synthetic carried-to-girder loads; keep design geometry and reaction-transfer evidence separate. Advance documented edition/material checks, plate applicability metadata and geometry modeling only where inputs are verified. Continue exact review-render replay and independent numerical regressions. Do not infer unprovided capacities or allow fabrication.

## Batch 006 — 2026-11-21T22:04:01Z (UTC)

**Reviewed implementation:** [`f1ff125c353dac19c9068df7c5afee4c0c4a3853`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/f1ff125c353dac19c9068df7c5afee4c0c4a3853). Baseline GitHub `main` `e0972db` had 192 passing tests. Full integrated `npm run check`: **209 passed, 0 failed, 0 skipped**. Six isolated lanes plus integration and the standalone preview CLI.

| Worker | Completed scope and changed code |
| --- | --- |
| 1 Structural | `packages/analysis/src/authored-case-replay.ts`: binds exact named case, model revision, joint geometry, stiffness, supports and ordered signed channel evidence before recomputing a globally and jointly audited solve. Same-total changes still reject. No code load factors. |
| 2 Lumber | `packages/lumber/src/{stock-demand-evidence,index}.ts`: recomputes audited explicit member demands and holds stock candidates whose exact revision, case, modeled demand or documented basis does not match. No NDS design, lumber capacity, allocation or recommendation. |
| 3 Connector plates | `packages/connections/src/plate-orientation-demand.ts`: shows independently scope-matched signed per-case axial and member-on-joint force components beside the unsigned geometrical angle. No grain or tooth orientation, plate placement or capacity. |
| 4 Geometry | `packages/geometry/src/hip-roof-section.ts`: transverse profile through the bounded equal-pitch reference, including both end regions and the ridge transitions. Roof planes only, not hip trusses, bearings, load paths or fabrication geometry. |
| 5 Manufacturing | `packages/fabrication/src/preliminary-review-consumer.ts`: separately expected schema, identity-only purpose, revision and digests are checked before frozen replay. Unknown or manufacturing fields quarantine the payload. No production integration. |
| 6 Testing | `tests/independent-indeterminate-square-benchmark.test.mjs`: elastic compatibility for a square with independent crossing bars, plus the sway mechanism without them. |
| Integration | `package.json`, `scripts/preview.mjs`, `README.md`: `npm start` builds and runs a fixed synthetic common-truss example; verified the 24-ft 5:12 run and the default 30-ft example. No site loads, permits, engineered designs, or cut/press/machine instructions. |

**Other changed tests:** `tests/{authored-case-replay,cli-smoke,hip-roof-section,lumber-stock-demand-evidence,plate-orientation-demand,preliminary-review-consumer}.test.mjs`.

**Independent checks:** closed-form indeterminate displacements, support and bar forces; 500-lb symmetric reactions in the fixed CLI example; signed reversal and zero end forces; four-plane section minima through both hips; single-bar force replay; stale/replaced/future contract holds. These are synthetic checks, not independently approved project engineering.

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. A runnable local preview, broader numerical checks and exact record binding do not verify any full engineering or production subsystem.

**Next batch:** improve explicit load and serviceability evidence with independent numerical benchmarks; advance edition-specific lumber and authorized maker-data interfaces without filling missing values; isolate supported truss geometry from roof-only references; implement only clearly documented review workflows in the standalone preview; keep production and machine outputs blocked. Licensed references, adopted/site inputs, actual connections and manufacturing validation, and qualified trusted engineering approval remain open.

## Batch 005 — 2026-11-21T21:49:06Z (UTC)

**Reviewed implementation:** [`0a9906ad06d3737ff7e905f8b93e7b7db9315cf1`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/0a9906ad06d3737ff7e905f8b93e7b7db9315cf1). Baseline GitHub `main` `9c0c655` had 176 passing tests. Full integrated `npm run check`: **192 passed, 0 failed, 0 skipped**. Six isolated worker lanes. New outputs remain preliminary and cannot authorize fabrication.

| Worker | Completed scope and changed code |
| --- | --- |
| 1 Structural | `packages/analysis/src/load-source-aggregation.ts`: combines explicitly named signed nodal load channels and preserves their separate provenance. Rejects duplicate channels or within-channel joints, unknown nodes, and nonfinite accumulation. No code combinations or load factors. |
| 2 Lumber | `packages/lumber/src/{stock-evidence-frontier,index}.ts`: gates schematic area/waste comparisons on exact catalog, stock and explicitly expected named-case receipt identity. Missing/held/mismatched records cannot hide a documented alternative. Documentation is not verification, capacity or sizing. |
| 3 Connector plates | `packages/connections/src/plate-orientation-review.ts`: joins one explicit long/short plate axis to replayed joint/model/revision and incident bars. Reports unsigned planar member-axis angles only, without placement, grain angle, selection or capacity. |
| 4 Geometry | `packages/geometry/src/hip-roof-reference.ts`: rectangular equal-pitch roof reference, four geometric hips and one level ridge, both dimensions within 8–50 ft. Not a hip truss topology, load path, design or assembly. |
| 5 Manufacturing | `packages/fabrication/src/preliminary-review-handoff.ts`: versioned external-review identity and manifest digest, replayed against independently expected source and revision; no members, cut instructions, stock, press or release. No Panelizer production integration. |
| 6 Testing | Benchmarked horizontal-reaction roller behavior and rotation when it loses its moment arm; also checked signed nodal loading, source-bound review handoff and fail-closed release together. |

**Changed tests:** `tests/{batch-005-cross-workstream,hip-roof-reference,independent-horizontal-roller-benchmark,load-source-aggregation,lumber-stock-evidence-frontier,plate-orientation-review,preliminary-review-handoff}.test.mjs`.

**Independent checks:** force and moment balance with signed cancellation; closed-form roller reactions, signed axial forces and displacements; rigid-body mechanism rejection; equal-pitch ridge inset, rise and length; 0°, 45° and 90° axis relationships; exact scope and substituted-revision rejections. These check the software and synthetic examples, not site loads, engineering performance, licensed material data, or plate capacity.

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. The hip reference is not a truss geometry gate and the handoff is a metadata-only contract, not a design export. The tested preliminary workflows do not close any major engineering gate.

**Next batch:** link authored load channels to a replayable revision/case envelope; bind stock case receipts to independently replayed demands before advancing ranking; preserve signed per-member end forces separately from unsigned connector angle; advance a bounded supported geometry option without inventing an attic brace, hip girder, or bearing detail; harden the preliminary consumer contract with independent version/scope checks; add numerical regression and integrated acceptance. Actual NDS and manufacturer data, project load verification, independent qualified review, and trusted fabrication release remain blocked.

## Batch 004 — 2026-11-21T21:33:51Z (UTC)

**Reviewed implementation:** [`c0735630b46042bde5e2eb35166952aed8a23942`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/c0735630b46042bde5e2eb35166952aed8a23942). Baseline GitHub `main` `cb5e1fc` had 161 passing tests. Full integrated `npm run check`: **176 passed, 0 failed, 0 skipped**. Six isolated worktrees. Only preliminary workflows were added.

| Worker | Completed scope and changed code |
| --- | --- |
| 1 Structural | `packages/analysis/src/member-line-load.ts`: explicit signed planar line loads per actual member inch over an interval on one real modeled bar; equivalent endpoint forces preserve resultant and moment, not local bending/shear. |
| 2 Lumber | `packages/lumber/src/{stock-frontier,index}.ts`: explicit, traceable schematic eligible/held stock offers and non-dominated area/unused-length options. No hidden preferred pick, stock reservation, structural NDS sizing, or capacity. |
| 3 Connector plates | `packages/connections/src/plate-joined-review.ts`: joins independently expected product/use basis to exact joint, model/revision and replayed named cases; missing/swapped evidence holds, no release or capacity fields. |
| 4 Geometry | `packages/geometry/src/attic-topology.ts`: central clearance and edges/centerlines for a narrow schematic seated attic graph, current 50-ft cap. The open bay is explicitly not a stable pin-jointed model; no solver, floor structure, or fabricated brace. |
| 5 Manufacturing | `packages/fabrication/src/preliminary-materials-change-catalog.ts`: deterministic directional QA change catalog replays two independently expected geometry revisions; rejects stale, newer and forged outputs. No issue/cut/stock/machine instructions. |
| 6 Testing | Independent unequal-stiffness reciprocity and strain-energy benchmark. Root end-to-end comparison of two attic room revisions demonstrates correct schematic changes without bypassing structural or release holds. |

**Changed test files:** `tests/{attic-room-topology,batch-004-cross-workstream,independent-reciprocity-benchmark,lumber-stock-frontier,member-line-load,plate-joined-review,preliminary-materials-change-catalog}.test.mjs`.

**Independent checks:** planar force/moment conservation including reversed bar endpoints, closed-form cross-work and strain energy for unequal stiffness, explicit room clearance and member-count falsification, and deterministic synthetic stock comparisons. No site conclusions, licensed material/plate data or actual load capacity verified.

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, fabrication/Panelizer integration **20%**. The additions strengthen preliminary evidence and options, not independent engineering verification. Additional topology, site inputs, licensed capacity/edition data, approved capacity-based optimization, trusted release and production integration remain open.

**Next batch:** 1) robust source/demand aggregation or independently verified numerical stability; 2) strict evidence for grade/load-case eligibility before candidate ranking; 3) precise metadata for actual plate use/load/orientation without capacity inference; 4) bound one additional family or supported option without inserting an unverified attic brace; 5) deterministic review-only cut/stock/press exclusions in a consumer handoff; 6) add independent analytical/falsification and integrated checks. Fabrication remains fail-closed.

## Batch 003 — 2026-11-21T21:19:26Z (UTC)

**Reviewed implementation:** [`635d88961a51e38f2c0a44a5315582f062edeacb`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/635d88961a51e38f2c0a44a5315582f062edeacb). Baseline GitHub `main` `b7dcb20` had 145 passing tests. Full integrated `npm run check`: **161 passed, 0 failed, 0 skipped**. Six isolated worktrees. No default site values, licensed capacities, or release authority added.

| Worker | Completed scope and changed code |
| --- | --- |
| 1 Structural | `packages/analysis/src/site-hazard-snapshot.ts`: offline ground-snow metadata binds exact site, edition/risk/units, evidence and original PDF digest. Does not authenticate source/transcription or derive roof loads. |
| 2 Lumber | `packages/lumber/src/{modulus-provenance,index}.ts`: separate E and Emin receipts tied to exact catalog selection and expected Supplement plus addendum evidence; stale or swapped input holds the preliminary study. No NDS readiness or tables. |
| 3 Connector plates | `packages/connections/src/plate-reference-evidence.ts`: manufacturer/product family and revision/use/measurement metadata checks across toothed, nail-applied and hinge references. Explicit gross/net, orientation, moisture and single/paired basis; capacity fields are rejected. |
| 4 Geometry | `packages/{geometry/src/agricultural-topology,analysis/src/agricultural-gable-analysis}.ts`: small tied Fink-like agricultural gable subset, level pin/roller bearings, zero heel/overhang offsets, explicit signed joint loads, equilibrium audits, 50-ft cap. Not agricultural family completion or roof load placement. |
| 5 Manufacturing | `packages/fabrication/src/preliminary-materials-traceability.ts`: strict v1 expected design/revision and independent canonical schematic geometry SHA-256. Preserves only source geometry provenance and rejects equal-length model substitution; no load, stock, cut or machine output. |
| 6 Testing | Independent analytic two-bar rotation/translation test and root end-to-end agricultural model → schematic material manifest validation with equal-length geometry substitution rejected. |

**Changed test files:** `tests/{agricultural-gable-analysis,batch-003-cross-workstream,independent-rotation-benchmark,lumber-modulus-provenance,plate-reference-evidence,preliminary-materials-traceability,site-hazard-snapshot}.test.mjs`.

**Independent checks:** closed-form combined-load agricultural bearing reactions, analytical rotation of two-bar displacements/reactions preserving signed member forces, standard SHA-256 comparison and substitution tests. Synthetic metadata tests do not verify adopted editions, real site values, published capacities, or use on a project.

**Estimates, unchanged:** lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, fabrication/Panelizer integration **20%**. The narrow agricultural subset and evidence adapters extend a previously counted preliminary milestone; they do not close a new major gate.

**Next batch:** 1) add explicit typed project hazard/report context or demand envelope evidence without turning ground snow into roof design, 2) implement explicit preliminary candidate constraint/trace diagnostics and hold unsupported criteria, 3) bind reviewed connector metadata to case/model evidence with deterministic no-capacity status, 4) investigate a bounded seated attic topology or reject unsupported options, 5) extend provenance-aware preliminary downstream reports without machine access, 6) continue independent hand/falsification benchmarks and full integration.

Provenance guidance only: [ASCE Hazard Tool](https://www.asce.org/publications-and-news/asce-hazard-tool/about/), [AWC 2024 Supplement](https://awc.org/resources/2024-nds-supplement/), [ICC-ES ESR-1118](https://cdn-v2.icc-es.org/wp-content/uploads/report-directory/ESR-1118.pdf) and [ESR-1988](https://cdn-v2.icc-es.org/wp-content/uploads/report-directory/ESR-1988.pdf). Confirm the exact authorized file revision and applicability before using actual values. No source tables or design values are embedded. Fabrication stays fail-closed.

## Batch 002 — 2026-11-21T21:05:31Z (UTC)

**Reviewed implementation:** [`a8268245c423b6eed6e5ee9e310905a377fd6d5e`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/a8268245c423b6eed6e5ee9e310905a377fd6d5e). Baseline GitHub `main` `04fc26f` had 127 passing tests. Full integrated `npm run check`: **145 passed, 0 failed, 0 skipped**. Six isolated workers. No code factors, licensed capacity data, or authorization added.

| Worker | Completed scope and changed code |
| --- | --- |
| 1 Structural | `packages/analysis/src/distributed-line-load.ts`: explicit signed linear intensity over a partial horizontal interval to statically equivalent loads on existing adjacent chord-panel joints. Preserves force/moment; no local bending, shear or site code loads. |
| 2 Lumber | `packages/lumber/src/{axial-stability-study,index}.ts`: separate tension/compression and ideal Euler/slenderness reference on both axes for stated modulus, unbraced lengths, factors and restraint context. Not NDS design or qualification. |
| 3 Connector plates | `packages/connections/src/{plate-screen,plate-model-binding}.ts`: exact revision, coordinates, connectivity, stiffness, supports and named load binding; solver replay rejects stale or swapped force evidence. No verified resultant/capacity/plate selection. |
| 4 Geometry | `packages/analysis/src/mono-analysis.ts`: audited idealized mono analysis from the schematic topology, named pin/roller and authored point loads. Enforces 50-ft bound and unsupported options. |
| 5 Manufacturing | `packages/fabrication/src/{preliminary-materials,preliminary-materials-revisions}.ts`: strict frozen v1 parse and same-design revision diffs, retains identifiers and centerline-only scope. Extra fields, altered geometry and release flags rejected. |
| 6 Testing | Hand-derived two-panel reactions, all member-force signs including zero-force chord, and displacement regression. Root integrated a partial mono load with exact plate binding and frozen materials snapshots. |

**Changed test files:** `tests/{batch-002-cross-workstream,distributed-line-load,independent-multipanel-benchmark,lumber-axial-stability-study,mono-analysis,plate-model-binding,preliminary-materials-revisions}.test.mjs`.

**Independent checks:** partial uniform, linear and signed panel resultant and first moments; asymmetric mono bearing reactions; hand equilibrium and axial compatibility for a two-panel example; rectangular section stress and both Euler reference axes. These are math/software checks, not project design verification.

**Estimates:** Lumber **20%**, connector plates **20%**, geometry/analysis **40%**, optimization **20%**, fabrication/Panelizer integration **20%**. Batch 002 strengthens the previously counted preliminary milestone in each lane; it does not close any additional major engineering gate. Edition/site loads, verified licensed lumber and plate data, independent qualified review, capacity-based optimization, and production integration remain open.

**Next batch:** 1) independently verify explicit roof load transfer toward site-specific intake without inferring factors; 2) preserve provenance across separate explicit modulus/restraint choices and prepare licensed reference adapters; 3) validate manufacturer dataset identity and use-bound attestation without capacities shipped by default; 4) advance attic, agricultural or mono options only where supported by an audited topology; 5) enforce preliminary consumer revision/source compatibility and add QA semantics; 6) continue hand benchmarks, falsification and complete tests. Fabrication stays fail-closed.

## Batch 001 — 2026-11-21T20:54:30Z (UTC)

**Reviewed implementation:** [`91bbeb7e038183efbdbc94115d5851eaf09da6b4`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/91bbeb7e038183efbdbc94115d5851eaf09da6b4). Based on GitHub main `baf0e10`. Full `npm run check`: **127 passed, 0 failed, 0 skipped**; baseline 111. Six isolated worktrees were used; only the reviewed implementation and status were integrated. The 50-foot limit and fail-closed fabrication gate are unchanged.

| Worker | Completed scope and changed code |
| --- | --- |
| 1 Structural | `packages/analysis/src/explicit-load-combinations.ts`: signed authored joint-load superposition with provenance, finite-input checks and no inferred load cases or code factors. |
| 2 Lumber | `packages/lumber/src/design-readiness.ts`, `packages/lumber/src/index.ts`: exact catalog/grade/size/edition and source evidence crosscheck; still never NDS-ready or structurally approved based on caller metadata. |
| 3 Connector plates | `packages/connections/src/plate-screen.ts`: simultaneous signed axial and resolved member-end demand per case, without mixing governing extrema or computing plate capacity. |
| 4 Geometry | `packages/geometry/src/mono.ts`: preliminary mono-pitch graph with nine joints and 15 members; unsupported heel, overhang and lower-chord options rejected, 50-foot cap tested. No mono analysis or capacity claim. |
| 5 Manufacturing | `packages/fabrication/src/preliminary-materials.ts`: versioned design/revision/member/joint identifiers and analytic centerlines in inches, always marked NOT FOR FABRICATION. No cut, purchase or equipment data. |
| 6 Testing | Independent asymmetric 2D truss checks for reactions, axial-force signs and displacements; root integration test reconciles the same model across authored cases, connector demands, schematic material rows and release denial. |

**Test files:** `tests/{batch-001-cross-workstream,explicit-load-combinations,independent-structural-benchmark,lumber-design-readiness,mono-topology,plate-demand-evidence,preliminary-materials-export}.test.mjs`.

**What was independently checked:** hand-equilibrium reactions and axial forces under an asymmetric combined point-load fixture; displacement from axial compatibility; separate signed joint demands for coincident synthetic gravity and uplift cases; scalar factor superposition and balanced reactions. These checks apply to software examples, not a truss design for a job.

### Estimated project progress by subsystem

These are engineering-program estimates, not code percentages or release approval. Each approximate 20% represents one of five comparable milestones supported by current code/tests, as noted. Completion still requires qualified engineering verification.

| System | Estimate | Evidence and remaining milestone gates |
| --- | ---: | --- |
| Lumber engineering and sizing | 20% | Catalog and exact source intake/ranking in place. Licensed edition-specific tables, verified adjustment factors, strength/stability/interaction checks, and approved sizing benchmarks remain. |
| Connector-plate engineering | 20% | Case-coincident member-demand inventory in place. Licensed manufacturer data, validated grip/orientation and plate mechanics, placement/splices, and independently verified capacity/selection remain. |
| Geometry and structural analysis | 40% | Preliminary common/scissor solver and independent numerical checks plus authored load combinations; attic/agricultural/mono geometry remains partial, hip missing. Complete family topology/analysis, edition/site code loads, and stability/restraint/bearing validation remain. |
| Automatic design optimization | 20% | Preliminary ranking by demand and material area. Verified constraints, coupled selection, stock/cost objective, and independent optimizer verification remain. |
| Manufacturing and Panelizer contracts | 20% | Schematic SVG/centerline report and versioned preliminary traceability contract. Verified shop dimensions, plates/assembly, QA/revision records, and tested downstream integration and trusted release remain. |

**Dependencies and next batch:** Continue engineering inputs without inventing data. Worker 1: explicit distributed signed load transfer and reactions, no default code factors; Worker 2: scope licensed NDS source provenance and adjustment-factor verification; Worker 3: exact model/revision binding and manufacturer data intake that cannot approve a plate; Worker 4: independently bench mono load-model connectivity and bearings, then attic topology; Worker 5: versioned preliminary consumer-contract consistency and revision changes, no machine output; Worker 6: independent worked checks and full integration. If another session changes overlapping files, rebase/retest or choose a nonoverlapping task.

Edition references for authorized research, **not adoption for any jurisdiction:** [AWC 2024 NDS and errata](https://awc.org/resources/2024-nds), [AWC 2024 Supplement](https://awc.org/resources/2024-nds-supplement/), [TPI standards](https://www.tpinst.org/documents), [ASCE/SEI 7-22](https://www.asce.org/publications-and-news/codes-and-standards/asce-sei-7-22/). Applicable editions, authorized use of licensed data, project load inputs, and independent qualified review must be established before checking a real design. No numeric standard tables or manufacturer capacities were added. Nothing authorizes fabrication.
