# Woodtruss development status

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
