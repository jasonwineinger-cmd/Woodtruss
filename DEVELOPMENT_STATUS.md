# Woodtruss development status

## Batch 060 — 2026-11-22T11:33:08Z (UTC)

**Reviewed implementation:** [`f7276010cf7d80166f40f0c14e9b632f4650f010`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/f7276010cf7d80166f40f0c14e9b632f4650f010). Baseline `e0b6206`: 741 passing. Full `npm run check`: **747 passed, 0 failed, 0 skipped**. Six independent computation, integration, benchmark, documentation and review lanes.

| Worker | Scope |
| --- | --- |
| 1 Sweep | `stock-pareto-sweep.ts`: sorts eligible objectives by area and unused stock length, keeps exact ties and returns original candidate order. |
| 2 Integration | `lumber-stock-pareto-frontier-integration.test.mjs`: removing both undocumented dominators restores two tied alternatives, but no short or unavailable candidate. |
| 3 Independent oracle | `stock-pareto-sweep-benchmark.test.mjs`: 400 seeded pairwise-reference datasets and a 20,017-row exact nondominated dataset; no timing threshold. |
| 4 Scope | README and `stock-pareto-sweep-boundary.md`: O(n log n) dominance stage, not inventory, structural selection, or a runtime guarantee. |
| 5 Review | Independently derived exact ties/strict dominance proof and checked evidence eligibility before each sweep; no release changes. |
| 6 Boundary tests and root | `stock-pareto-sweep-boundary.test.mjs`, `stock-frontier.ts` and `stock-evidence-frontier.ts`: preserve input ownership, reject invalid objective rows and route both paths through one exact sweep. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. This is per-member schematic screening only, not a whole-truss inventory allocation or approved choice.

**Next:** Independently audit a whole-truss reported-stock contention scenario or another explicit optimization objective boundary; do not reserve or recommend stock or imply capacity.

## Batch 059 — 2026-11-22T11:20:07Z (UTC)

**Reviewed implementation:** [`f0215b94cd6b2eed63ac0813a9d44f623edc4fb2`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/f0215b94cd6b2eed63ac0813a9d44f623edc4fb2). Baseline `7b691ad`: 734 passing. Full `npm run check`: **741 passed, 0 failed, 0 skipped**. Six independent identity, benchmark, documentation and review lanes plus integration.

| Worker | Scope |
| --- | --- |
| 1 Exact receipt | `catalog-elastic-modulus-source-row.ts`: match declared NDS Supplement or update, exact artifact ID/digest, stock row, E/Emin role and ordered model assignment. |
| 2 Negative coverage | `catalog-elastic-modulus-provenance.test.mjs`: wrong role with equal numeric value, inconsistent source, and reused assignment IDs on revised models held. |
| 3 Independent values | `catalog-elastic-modulus-source-row.test.mjs`: synthetic role, row, revision, orientation and digest checks without published quantities. |
| 4 Scope | README and `catalog-elastic-modulus-provenance-boundary.md`: documentary match only; grading values cannot substitute for an NDS role. |
| 5 Audit and history | Moved exact old Batches 021–035 into linked `development-history-batches-021-035.md`, preserving all entries and original limits. |
| 6 Boundary oracle and root | `catalog-elastic-modulus-provenance-boundary.test.mjs` and `catalog-elastic-modulus-provenance.ts`: exact numeric audit first, separate expected source and receipt per member; no raw IDs/values or authority in results. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. No document authenticity, licensed value, real suitability, actual stock orientation, code acceptance or fabrication verified.

**Next:** Rebalance to an independent optimization window/demand comparison or a clearly scoped stock evidence gap. Do not treat documentary roles as a source for code defaults, automatic stock approval or release.

## Batch 058 — 2026-11-22T11:02:42Z (UTC)

**Reviewed implementation:** [`460e822d99d770465d1c47fd046fd7c9671b1756`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/460e822d99d770465d1c47fd046fd7c9671b1756). Baseline `e1b52b0`: 727 passing. Full `npm run check`: **734 passed, 0 failed, 0 skipped**. Six independent section, identity, benchmark, documentation and review lanes plus integration.

| Worker | Scope |
| --- | --- |
| 1 Section arithmetic | `catalog-elastic-section-axis-check.ts`: explicit rectangle axis and named mean/minimum modulus field, exact E, no inferred dimensions or axis. |
| 2 Boundary cases | `catalog-elastic-member-stiffness.test.mjs`: synthetic A/I/E and malformed, duplicate or stale directed assignments held. |
| 3 Independent mechanics | `catalog-elastic-section-axis-check.test.mjs`: hand A=8 and directional I=32/3 versus 8/3, square section still explicit, representational noise only. |
| 4 Scope | README and `catalog-elastic-member-stiffness-boundary.md`: no catalog or grade authentication, net section, shear, fixity, acceptance or release. |
| 5 Audit | Prior axial-only A/E check unchanged; declaration does not validate physical geometry or licensed source. |
| 6 Boundary oracle and root | `catalog-elastic-member-stiffness-boundary.test.mjs` and `catalog-elastic-member-stiffness.ts`: same model/revision and ordered endpoints, unique member and assignment records, no sensitive numeric payload in outcomes. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Catalog applicability, section orientation in the actual truss, real strength and release are not established.

**Next:** Investigate a bounded evidence match that joins independently reviewed exact catalog provenance to the selected directed frame without converting it into a source of automatic approval, or address the next optimization verification gap.

## Batch 057 — 2026-11-22T10:48:06Z (UTC)

**Reviewed implementation:** [`612c93b315d178fa1b4fae9e368ffa5bb7e548ca`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/612c93b315d178fa1b4fae9e368ffa5bb7e548ca). Baseline `1583f22`: 723 passing. Full `npm run check`: **727 passed, 0 failed, 0 skipped**. Six parallel validation, independent source and review lanes plus integration.

| Worker | Scope |
| --- | --- |
| 1 Requirement identity | `tpsx-design-qc-requirement-rows.ts`: exact known joint label and placement, member cross-links and separately explicit area and tooth values; literal zero counts only. |
| 2 Boundary cases | `tpsx-design-qc-requirements.test.mjs`: synthetic Gross/Net, row permutations, distinct zero combinations, malformed numbers and incomplete or foreign scope. |
| 3 Independent local replay | Two private publisher sample projections reproduced 53 and 65 declared joint-member rows; six integer-zero tooth entries in the latter had separate positive areas. No sample files committed. |
| 4 Boundary documentation | README and `tpsx-design-qc-requirements-boundary.md` distinguish source declarations from observations, capacity or acceptance. |
| 5 Source audit | Reviewed exact publisher scope; sample methods are Gross, Net is a documented declaration only. No conversion or semantic acceptance. |
| 6 Boundary oracle and root | `tpsx-design-qc-requirements-boundary.test.mjs` and `tpsx-design-qc-requirements.ts`: inputs must bind to same v0.9.4 design graph and stated inches; extra observations, authority and destinations held. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. No observation, capacity, acceptance semantics or fabrication authorized.

**Next:** Rebalance to a scoped lumber assignment or optimization verification gap. Compare audit coverage for directed elastic-frame member geometry, section axis and modulus source before extending; no catalog defaults.

## Batch 056 — 2026-11-22T10:34:41Z (UTC)

**Reviewed implementation:** [`44638ef2d2e89f23d6b60f3544a83270906b5125`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/44638ef2d2e89f23d6b60f3544a83270906b5125). Baseline `b71ca16`: 719 passing. Full `npm run check`: **723 passed, 0 failed, 0 skipped**. Six parallel link, boundary, source and review lanes plus integration.

| Worker | Scope |
| --- | --- |
| 1 Joint references | `tpsx-design-qc-joint-links.ts`: exact bounded placement, contact and member QC coverage. |
| 2 Boundary cases | `tpsx-design-qc-links.test.mjs`: identity and quantities, duplicate/dangling members or placements, unknown faces, absent coverage. |
| 3 Independent local replay | Two privately projected roof examples from independently reproduced single and grouped archive records both give 18 joints, 53 member references and 21 MemberQC rows. No publisher data included in the repository. |
| 4 Boundary documentation | README and `tpsx-design-qc-link-boundary.md`: design document links are not observations or approvals. |
| 5 Source audit | Checked all seven sample manifest occurrences against their selected documents. Where declared, TopBottom remains distinct from FrontBack; neither proves that a face was inspected. |
| 6 Boundary oracle and root | `tpsx-design-qc-link-boundary.test.mjs` and `tpsx-design-qc-links.ts`: review bounded v0.9.4 projection only; reject package bytes, unsafe shapes, extra paths or approval fields. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Still no full TPSX import, authenticity, observed QC, certified compatibility, real capacity or release.

**Next:** Verify the exact design-side requirements and separate observed records before linking a plate role or an inspection target. Do not infer member face observations, actual values, or tolerance meaning from identity agreement alone.

## Batch 055 — 2026-11-22T10:18:12Z (UTC)

**Reviewed implementation:** [`aaa1c2ff9f4a2d953ba48e69add13d40f75b9353`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/aaa1c2ff9f4a2d953ba48e69add13d40f75b9353). Baseline `42d4b53`: 710 passing. Full `npm run check`: **719 passed, 0 failed, 0 skipped**. Six parallel validation, source-boundary and review lanes plus integration.

| Worker | Scope |
| --- | --- |
| 1 Local byte match | `inspection-private-byte-digest.ts`: bounded exact nonshared byte view, copies only the supplied byte range before hashing. |
| 2 Scope cases | `job-truss-inspection-record-bytes.test.mjs`: reject changed bytes, wrong revision, document aliases or reported correction closure; detached metadata and byte mutation regression. |
| 3 Independent hash | `inspection-private-byte-digest.test.mjs`: independent Node digest, subarray sentinel and delayed provider, invalid/shared/detached views and provider failure. |
| 4 Scope | README and `inspection-private-record-byte-boundary.md`: local agreement only, no caller identifiers, bytes or digest in returned evidence. |
| 5 Release audit | Existing documentary inputs and physical, signature, repair, shipping and machine holds unchanged; no network, parsing or release integration. |
| 6 Boundary oracle and root | `job-truss-inspection-record-boundary.test.mjs` and `job-truss-inspection-intake.ts`: independent expected inspection ID and design revision, verified documentary gate first, malformed and unsafe input held. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Synthetic digest agreement is not record authenticity or qualified inspection.

**Next:** Review one bounded design-side QC exchange pattern from the [official SBCA TPSX reference](https://www.sbcacomponents.com/tpsx), separately from observation and record bytes. No source package, schema or claim of compatibility is included here.

## Batch 054 — 2026-11-22T10:02:37Z (UTC)

**Reviewed implementation:** [`b0133699504cc70408a67c74d5b4073dc5ab8b2c`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/b0133699504cc70408a67c74d5b4073dc5ab8b2c). Baseline `5f9e978`: 705 passing. Full `npm run check`: **710 passed, 0 failed, 0 skipped**. Six independent scoped model, failure, computation, documentation and audit lanes plus integration.

| Worker | Scope |
| --- | --- |
| 1 Directed model | `raised-heel-double-fink-authored-elastic-frame-model.ts`: 18 nodes and 33 directed members, actual L/E bearings distinct from top HL/HE, no borrowed ordinary end assignments. |
| 2 Boundaries | `raised-heel-double-fink-authored-boundaries.test.mjs`: 8–50 ft, 1–48 in heel, held stale alias, reverse assignment, foreign support/action and singular solutions. |
| 3 Global benchmark | `raised-heel-double-fink-authored-benchmark.test.mjs`: independent weighted upper horizontal lever arms and uneven vertical load, checked moments about elevated T3 and supporting reactions. |
| 4 Scope | README and `raised-heel-double-fink-authored-elastic-frame-scope.md`: authored actions and properties, separate ordinary geometry-only CLI, no supplier or bearing detail. |
| 5 Release and geometry audit | Confirmed directed heel wedges and topology bounds only; no CLI, preview or release wiring. Explicit ideal restraints and solver stability still required. |
| 6 Local oracle and root | `raised-heel-double-fink-authored-axial.test.mjs` verifies signed actions for both heel wedges by hand limit; `raised-heel-double-fink-authored-elastic-frame-study.ts` returns fresh named-origin reaction cases. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Synthetic bilateral reactions and centerlines do not substantiate uplift support, material, plate choice, physical or manufacturing acceptance.

**Next:** Rotate from geometry to exact local inspection-record byte evidence. Bind a dedicated fixture to its already reviewed expected record ID, revision and digest, without treating bytes or a submitted signature identifier as an authenticated inspection, repair closure, or release.

## Batch 053 — 2026-11-22T09:47:27Z (UTC)

**Reviewed implementation:** [`2e51a2a201584ce24554795269fce442c2c40793`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/2e51a2a201584ce24554795269fce442c2c40793). Baseline `7f561bb`: 700 passing. Full `npm run check`: **705 passed, 0 failed, 0 skipped**. Six independent model, boundary, computation, documentation and review lanes plus integration.

| Worker | Scope |
| --- | --- |
| 1 Directed model | `double-fink-authored-elastic-frame-model.ts`: ordinary Double Fink 16 nodes and 29 directed members, explicit per-member stiffness/releases and actual L/E bearings. |
| 2 Boundaries | `double-fink-authored-boundaries.test.mjs`: exact 8–50 ft, no raised heel, overhang or sloping bottom, wrong direction/target and singular restraints held. |
| 3 Global benchmark | `double-fink-authored-benchmark.test.mjs`: independent weighted ascending/descending member measures, lever arms about T4, signed reactions and force/moment closure. |
| 4 Scope | README and `double-fink-authored-elastic-frame-scope.md`: standalone library path, separate geometry-only CLI and no supplier equivalence. |
| 5 Release and geometry audit | Reviewed ordered panel connectivity and near-flat pitch boundary; no preview, design or release behavior changes. |
| 6 Local oracle and root | `double-fink-authored-axial.test.mjs`: 24-ft synthetic bilateral 550/650 lb reactions and eight signed chord/web forces through method of joints; `double-fink-authored-elastic-frame-study.ts` binds freshly solved exact combinations. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. No actual truss, plate, bearing, bracing, design load or authority was verified.

**Next:** Advance an independently checkable raised Double Fink or a separately bounded lumber, connection or manufacturing evidence gap. Preserve exact separation from supplier and historical references; license, demand-to-capacity and physical sign-off are still outstanding.

## Batch 052 — 2026-11-22T09:33:06Z (UTC)

**Reviewed implementation:** [`46b17a79bcf77ab0dae97539926b71089cf61375`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/46b17a79bcf77ab0dae97539926b71089cf61375). Baseline `98c1c6e`: 693 passing. Full `npm run check`: **700 passed, 0 failed, 0 skipped**. Six independent geometry, boundary, computation, documentation and audit lanes plus integration.

| Worker | Scope |
| --- | --- |
| 1 Directed model | `raised-heel-common-authored-elastic-frame-model.ts`: 10-node, 17-member frame with explicit direction, properties and end releases; HL/HE are distinct from L/E bearings. |
| 2 Boundaries | `raised-heel-common-authored-boundaries.test.mjs`: 50-ft span, 1–48 in heel, input ownership, unused source targets and unstable ideal restraints. |
| 3 Global benchmark | `raised-heel-common-authored-benchmark.test.mjs`: direct weighted force and moment oracles show that moving an action from HL to L removes its lever arm; four synthetic combinations. |
| 4 Scope | `raised-heel-common-authored-elastic-frame-scope.md` and README distinguish the authored elastic and older illustrative pin models. |
| 5 Release audit | Existing family dispatch, preview and fabrication boundaries remain untouched; no new CLI or authorization path. |
| 6 Independent local oracle and root | `raised-heel-common-authored-axial.test.mjs` independently checks four signed heel-region member forces and cross-checks all 17 in the all-release limit. `raised-heel-common-authored-elastic-frame-study.ts` binds new exact combinations and fresh reaction receipts. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. The reported negative ideal support reaction does not verify uplift resistance, actual material, plates, bearing, stability, site loads, or authority.

**Next:** Compare another bounded topology (ordinary or raised-heel Double Fink) against a synthetic independent load path, or extend exact raised-heel selections without inferring field behavior. Licensed design and plate values and physical engineering verification remain held.

## Batch 051 — 2026-11-22T09:18:43Z (UTC)

**Reviewed implementation:** [`539b62219d58aaa408225272ea176081951cfbef`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/539b62219d58aaa408225272ea176081951cfbef). Baseline `f0e3b78`: 689 passing. Full `npm run check`: **693 passed, 0 failed, 0 skipped**. Six parallel selection, validation, quantitative and review lanes plus integration.

| Worker | Scope |
| --- | --- |
| 1 Selection | `mono-authored-section-cut-selection.ts`: exact ordered per-case directed member, bounded station and side selections. |
| 2 Boundaries | `mono-authored-section-cut-boundaries.test.mjs`: unique exact rows, point-side and bounds checks, unsupported inputs held. |
| 3 Independent benchmark | `mono-authored-section-cut-benchmark.test.mjs`: synthetic axial point jump, sign reversal and exact cancellation without a jump. |
| 4 Scope | `mono-authored-section-cut-scope.md` and README: inside-member end limits and distinction between model sections and shop cuts. |
| 5 Solver audit | Exact cancellation with other loading retains its authored point station and left/right labels without changing the net action. No CLI or release wiring. |
| 6 Independent mechanics and root | `mono-authored-elastic-frame-section-cuts.ts`: co-located freshly solved vector; checked the transverse point benchmark including surrounding-frame axial force and independent shear/moment. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. No inferred support, site load, actual material/capacity, shop cut or authority.

**Next:** Rebalance to another explicitly bounded topology or independent engineering verification gap. Check raised-heel and Double Fink support choices before adding any new geometry; compare with a hand or primary example where licensed and source-complete.

## Batch 050 — 2026-11-22T09:03:53Z (UTC)

**Reviewed implementation:** [`7f50587dabb9600a5b4f3d364378cb8a2cc17584`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/7f50587dabb9600a5b4f3d364378cb8a2cc17584). Baseline `e13c0c3`: 685 passing. Full `npm run check`: **689 passed, 0 failed, 0 skipped**. Six parallel model, review, evidence and validation lanes plus integration.

| Worker | Scope |
| --- | --- |
| 1 Selection | `mono-authored-displacement-selection.ts`: exact ordered node/station requests and directed member identities without extrapolation. |
| 2 Boundaries | `mono-authored-displacement-boundaries.test.mjs`: 50-ft cap, requested ordering, malformed/out-of-member requests and no injected results. |
| 3 Independent model benchmark | `mono-authored-displacement-benchmark.test.mjs`: verified global T4 motion and distinct private section rotation in the all-release pin limit with signed load reversal. |
| 4 Scope | `mono-authored-displacement-scope.md` and README: global vs local movement, authored cases only and no physical measurement. |
| 5 Solve audit | Require same-frame target checks even on unused sources, fresh per-case results and no partial success. |
| 6 Independent mechanics and root | `mono-authored-elastic-frame-displacements.ts`: exact fresh solve; checked the continuous member sample and distinct axial shortening either side of the synthetic midpoint action. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. The numerical benchmarks do not verify gauged response, seating, allowable motion, design or release.

**Next:** Add a co-located signed section-demand review or a separate topology scope with an independent mechanics check. Keep model outputs segregated from stock, manufacturing and field evidence.

## Batch 049 — 2026-11-22T08:48:53Z (UTC)

**Reviewed implementation:** [`a44dcdc14a6215b92980a8dc2cc3b4fd1e05f4f6`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/a44dcdc14a6215b92980a8dc2cc3b4fd1e05f4f6). Baseline `00bd7c8`: 679 passing. Full `npm run check`: **685 passed, 0 failed, 0 skipped**. Six isolated geometry, model, test, documentation and audit lanes plus integration.

| Worker | Scope |
| --- | --- |
| 1 Directed model | `mono-authored-elastic-frame-model.ts`: strict mono roof input, exact directed centerline mapping and no property or support defaults. |
| 2 Boundaries | `mono-authored-elastic-frame-boundaries.test.mjs`: independent directed topology at the 50-ft cap, missing or stale assignments/supports/actions held. |
| 3 Benchmarks | `mono-authored-elastic-frame-benchmark.test.mjs`: weighted reactions and moments about B2 and an all-release ideal pin-joint reaction comparison. |
| 4 Scope | `mono-authored-elastic-frame-scope.md` and README document differences from the axial-only preview and what is not verified. |
| 5 Call-site review | Kept the existing preview and release logic unchanged; no inferred bearings, materials, loads or plate fixity. |
| 6 Independent oracle and root | `directed-authored-frame-binding.ts`, scissor reuse and `mono-authored-elastic-frame-study.ts`: same explicit input validation. Hand-checked projected vs actual member loading, plus vertical projection rejection. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Results apply only to authored synthetic assumptions, with no site, member design or fabrication authority.

**Next:** Add an independently derived signed mono displacement or exact section-action comparison for explicit cases and directed stations, separately from support reaction balance. Leave actual bracing, raised heels, field bearings and product sizing held.

## Batch 048 — 2026-11-22T08:33:10Z (UTC)

**Reviewed implementation:** [`b52d6ccedfcffeee18ef273c4e7685f96cf1651e`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/b52d6ccedfcffeee18ef273c4e7685f96cf1651e). Baseline `35a6069`: 674 passing. Full `npm run check`: **679 passed, 0 failed, 0 skipped**. Six independent documentation, validation, source and test lanes plus integration.

| Worker | Scope |
| --- | --- |
| 1 Paired detail evidence | `paired-face-inspection-evidence.ts`: both separately documented faces, exact independently scoped detailed joints, method-specific tooth declarations, duplicate and hold rules. |
| 2 Focused tests | `paired-face-inspection-evidence.test.mjs`: order-neutral exact receipt coverage, incompatible method, foreign/missing/duplicate faces and discrepancies. |
| 3 Job identity | `inspection-job-identity.ts`: exact job, physical truss ID, revision/hash and plant/setup/shift documentary identities. |
| 4 Reference note | `tpi-in-plant-inspection-evidence-boundary.md`: blank form vs actual records, prelim vs selected critical joints, correction records and separate weekly log. |
| 5 Approval audit | No authorization or CLI path; no raw evidence or approving record returned. |
| 6 Independent source and root | `job-truss-inspection-intake.ts`, its tests and README: exact separate record/signature references, holds unresolved or self-reported closure; nothing is authenticated. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. No real shop, signature, plant, load capacity or inspection verification. No shipping or fabrication authority.

**Next:** Rebalance to a bounded geometry and analysis benchmark. Examine authored mono or raised-heel geometry coverage and select an independent equilibrium/deflection comparison that preserves exact member, load and support assumptions and the 50-ft cap. Keep reported plant corrective work closed for software release.

## Batch 047 — 2026-11-22T08:18:30Z (UTC)

**Reviewed implementation:** [`1a4f6e7ed8549ee7e968a83749a87bca815a3cf2`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/1a4f6e7ed8549ee7e968a83749a87bca815a3cf2). Baseline `fd02b40`: 668 passing. Full `npm run check`: **674 passed, 0 failed, 0 skipped**. Six isolated evidence, analysis, implementation and test lanes plus integration.

| Worker | Scope |
| --- | --- |
| 1 Basis | `plate-resistance-basis-evidence.ts`: independent exact metadata for tooth, steel and hinge resistance, separate process evidence, denominator, section and axes; no manufacturer route qualification. |
| 2 Test lane | `plate-resistance-basis-evidence.test.mjs`: positive synthetic category matches and negative route, section, face, digest and authority assertions. |
| 3 Source scope | `plate-resistance-mechanism-and-label-boundary.md`: distinct Alpine and MiTek report categories, index vs product report and jurisdictional attachment. No capacity values copied. |
| 4 Identification | `plate-identification-reference-evidence.ts`: separate embossing, box token/role and exact product-report identity and hash. |
| 5 Audit | Reviewed existing library-only report checks and remaining field/lot evidence limits; no production consumer or stock validation. |
| 6 Independent source and root | Crosschecked official installation conflict and treatment distinctions; `plate-scoped-local-evidence.ts`, its tests and README tie exact source locator, family and independently declared scope to dated local report bytes. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. A report reference, process label or blank form does not qualify a product, stock, plant, press, installer or job.

**Next:** Investigate a local review-only inspection evidence contract for a distinct exact job, truss, joint and both independently documented faces. Use official form semantics only; a blank form or listed plant does not certify an actual job. No capacity calculations, manual machine actions or release.

## Batch 046 — 2026-11-22T08:02:50Z (UTC)

**Reviewed implementation:** [`56abd3319a06b90111862db4a493baf79080a43f`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/56abd3319a06b90111862db4a493baf79080a43f). Baseline `a194c1d`: 663 passing. Full `npm run check`: **668 passed, 0 failed, 0 skipped**. Six parallel review, source, implementation and test lanes plus integration.

| Worker | Scope |
| --- | --- |
| 1 Evidence audit | Existing reference metadata binds product/family/report/digest/basis, but not date or lifecycle. Exact source review did not bind an independent issuer observation. |
| 2 Approval-boundary audit | Library-only; exact bytes are not authenticity, validity, suitability or release. A printed renewal month is not an expiry timestamp. |
| 3 Observation code | `plate-report-observation-window.ts` compares explicitly dated, exact observations; calendar, stale observation, withdrawal, and ambiguous renewal-month cases hold. |
| 4 Boundary tests | `plate-report-observation-window.test.mjs` verifies a leap month, month-end versus renewal-only, date/identity/status negatives and no disclosure. |
| 5 Primary publication note | `tpi-2022-mitek-esr-1988-plate-source-boundary.md`: TPI edition and corrections; current ESR vs fire listing/older mirror; distinct tooth, steel and hinge scopes. No values copied. |
| 6 Independent sources and root | `plate-dated-local-report-review.ts`, its test and README bind the exact product/revision observation to separately authorized bytes; kept private inputs and approvals outside outputs. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. No product or press selected. A documentation match cannot approve embedment, engineering, fabrication or machine release.

**Next:** Separate independently declared plate resistance mechanism, embedment route, gross/net basis, directional denominator and per-face/pair identity. Bind the same exact source locator rather than accepting a steel row for teeth or treating a hinge as a toothed plate. Do not import capacity values or qualify actual equipment.

## Batch 045 — 2026-11-22T07:48:26Z (UTC)

**Reviewed implementation:** [`cf8f5c86ef8bb842274de05a8d46ff3a8af38118`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/cf8f5c86ef8bb842274de05a8d46ff3a8af38118). Baseline `1ce108d`: 658 passing. Full `npm run check`: **663 passed, 0 failed, 0 skipped**. Six parallel audit, implementation, source and test lanes, plus root integration.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Source role audit | Identified the gap between matching a publication inventory and specifying its exact source artifact per quantity. |
| 2 Interface and safety audit | Confirmed library-only, no production consumer; only existing six quantities are checked, no perpendicular compression or member-fit inference. |
| 3 Private artifact bytes | `edition-private-artifact-bytes.ts`: bound complete distinct inventory, copy exact nonshared byte views before any digest, hold any artifact mismatch without disclosure. |
| 4 Tests | `lumber-edition-bound-intake.test.mjs`: six complete synthetic receipts by source role; missing/corrupt base and update files and wrong-role quantity/digest hold as a whole. |
| 5 Evidence docs | `awc-2024-lumber-publication-boundary.md`: distinguish March Hem-Fir (North) and February Red Alder corrections and avoid applying the same addition twice. |
| 6 Byte race audit and root | `edition-bound-intake.ts`, index, README and `lumber-edition-private-artifact-bytes.test.mjs`: independently declared artifact IDs, no private fields in result, races and malformed buffers held. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. No licensed material data was enrolled, no factors were authored, and release remains locked.

**Next:** Advance an independent connector-plate source/evidence lane. Identify exact primary TPI scope and manufacturer-specific source limitations; prefer test/citation provenance boundaries rather than unverified capacities. For lumber, eventual per-factor source evidence and edition/applicability checks require independent authorization and shop/project facts; byte equality cannot substitute.

## Batch 044 — 2026-11-22T07:33:43Z (UTC)

**Reviewed implementation:** [`ea75b87c90760093e181f0db40121b4174b3da36`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/ea75b87c90760093e181f0db40121b4174b3da36). Baseline `08a6454`: 651 passing. Full `npm run check`: **658 passed, 0 failed, 0 skipped**. Six parallel source, implementation and verification lanes, plus root integration.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Source-role audit | Identified that the old design-input gate required one digest for both rule and stock roles. |
| 2 Scope and documentation | `awc-2024-lumber-publication-boundary.md`: official rules, Supplement and their separately published updates; no local edition adoption or licensing assumption. |
| 3 Source binding | `edition-publication-pair.ts`: compare independently declared exact editions, publisher and separate document and update identities; reject duplicates and malformed scope, report no values. |
| 4 Tests | `lumber-edition-publication-pair.test.mjs`: exact match, role/edition swaps, missing or excess updates, reuse and placeholders. |
| 5 Independent sources | Crosschecked AWC edition pages, rule errata, distinct Supplement updates and public view vs reuse boundaries. No design values copied. |
| 6 Call-site audit and root | `design-readiness.ts`, its tests, package index and README: optional same-signature callers hold unless complete paired scope is supplied; independent hash-role binding rejects older shared-digest receipts. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. No published material rows enrolled, no calibrated design methods, no fabrication authorization.

**Next:** Bind exact scoped private bytes and authorized per-quantity Supplement documentation to this pair without treating digest equality as authenticity; document the separately applicable rules correction set. Do not add licensed values, project code choices or engineering acceptance without their own independent evidence.

## Batch 043 — 2026-11-22T07:18:21Z (UTC)

**Reviewed implementation:** [`1a882d98814f14ee73aca0325299805a3c3e7677`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/1a882d98814f14ee73aca0325299805a3c3e7677). Baseline `5a70e76`: 641 passing. Full `npm run check`: **651 passed, 0 failed, 0 skipped**. Six isolated analysis, input and evidence lanes.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `scissor-model-observed-comparison.ts` freshly replays both ordered source inputs; reports signed paired readings and residuals only when the entire comparison is valid. |
| 2 Evidence identities | `scissor-measurement-correspondence.ts`: exact restrained model revision, specimen/test/source, protocol references, gauge and bearing IDs and complete ordered steps. Authored references are not authenticated. |
| 3 Numerical | `scissor-paired-observable-residual.ts` and tests: signed modeled-minus-observed, stable small mean, and individual and total bearing limits that cannot mask one another. |
| 4 Engineering scope | `scissor-model-observation-correspondence-scope.md` and README distinguish caller diagnostic tolerance, observed data reduction, model calibration and actual authority. |
| 5 Verification | `scissor-model-observed-comparison-benchmark.test.mjs`: separate synthetic readings with known gauge and bearing residuals, exact source inputs unchanged, no measured-test implication. |
| 6 QA and root | Exact scoped input swaps, malformed correspondence, late disqualifying rows, count and reported signed residual checks. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. No historic specimen is enrolled; a comparison does not fit or verify the physical model or release fabrication.

**Next:** Advance a separate authoritative lumber-input lane. Find a current official edition and narrow source-backed example suitable for traceable verification, distinguishing scope and licensing from published test modulus. Keep unsupported design or plate data held while seeking physically comparable test inputs.

## Batch 042 — 2026-11-22T07:05:16Z (UTC)

**Reviewed implementation:** [`cbb3b320b7dee9ead36989e8a1924066cc018e9f`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/cbb3b320b7dee9ead36989e8a1924066cc018e9f). Baseline `f59574b`: 633 passing. Full `npm run check`: **641 passed, 0 failed, 0 skipped**. Six isolated analysis, evidence and test lanes.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `scissor-modeled-three-gauge-restraint-study.ts`: same exact scissor frame and prescribed restraint across bounded weighted cases; individual signed vertical bearings and comparison-only modeled response. |
| 2 Derived results | `elastic-frame-horizontal-restraint-study.ts`: original and restrained global vertical maps read from the exact existing physical solves, excluding the virtual unit load. |
| 3 Model binding | `scissor-modeled-three-gauge-projection.ts` plus tests: exact labeled Q1/R/Q3, downward sign and stable equal mean; unknown or missing readings held. |
| 4 Evidence | `scissor-modeled-gauge-restraint-scope.md` and README keep model predictions distinct from observations, project code checks and fabrication. |
| 5 Analytical | `scissor-modeled-three-gauge-restraint-benchmark.test.mjs`: both authored directions, individual bearing equilibrium and separate physical solve check. |
| 6 QA and root | Reject old/unknown targets, observed or fitted input and unsupported geometry; verify 50-ft edge, signed reversal in spring case and exact restraint/origin metadata. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Modeled synthetic gauge comparisons do not reproduce the USDA specimen, determine actual fixity or approve fabrication.

**Next:** Add an evidence-binding gate for a future model-to-observation comparison. Require explicit independent specimen/model, protocol, gauge and load-level correspondence before reporting residuals, with no automatic fitting or default crosswalk. Continue exact physical source recovery separately.

## Batch 041 — 2026-11-22T06:49:15Z (UTC)

**Reviewed implementation:** [`9a484a01d87a0101798e42d528a404766a201864`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/9a484a01d87a0101798e42d528a404766a201864). Baseline `7c2bb15`: 623 passing. Full `npm run check`: **633 passed, 0 failed, 0 skipped**. Six isolated structural, numerical, boundary and evidence lanes.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `elastic-frame-horizontal-restraint-study.ts`: exact stable baseline, +1-lb X flexibility, unchanged ideal support set, separate modeled force, independent displacement closure and signed physical ledger. |
| 2 Numeric | `elastic-frame-horizontal-restraint-math.ts`: exact free, positive finite spring and rigid limits, signed resistance and representable-range safeguards. |
| 3 Inputs | `elastic-frame-horizontal-restraint-actions.ts` and tests: change only bearing X, preserve all other original actions, allow exact zero cancellation with explicit row and hold numerical loss. |
| 4 Test evidence | `elastic-horizontal-restraint-study-scope.md`: separation of preload/action and base reactions; no actual restraint, bearing, USDA fixture or capacity claim. |
| 5 Analytical | `elastic-frame-horizontal-restraint-benchmark.test.mjs`: direct axial free/spring/rigid and reversed horizontal force with independent vertical balance/couple. |
| 6 QA and root | Test exact scope rejection, authored loading/closure, two-member unequal axial flexibility at a distinct bearing and an overflow product with representable spring law outputs; update README. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. The spring is an explicitly authored sensitivity input, not fit to laboratory evidence or actual hardware. The 50-ft limit and fabrication lock are unchanged.

**Next:** Reuse the single-bearing diagnostic on explicitly authored scissor framing and capture signed vertical synthetic gauges across shared load cases, keeping modeled and observed data distinct. Do not infer historic specimen geometry, fixture restraint, plate stiffness or approval.

## Batch 040 — 2026-11-22T06:34:03Z (UTC)

**Reviewed implementation:** [`76754a6f6aed8583aa4c8fa16657c118c90f0c97`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/76754a6f6aed8583aa4c8fa16657c118c90f0c97). Baseline `d2fd160`: 619 passing. Full `npm run check`: **623 passed, 0 failed, 0 skipped**. Six isolated numeric, research and verification lanes.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural/test intake | `observed-scissor-three-gauge-study.ts`: exact specimen/test/channel IDs; three signed displacements and two signed bearing reactions per step; explicit loading-window endpoints and selected observations only. |
| 2 Numerical | `observed-scissor-stiffness-fit.ts`: intercept-bearing centered, scaled, compensated least squares with representable data bounds, strictly increasing reactions and positive identified slope. |
| 3 Measured data evidence | `usda-fpl-rp-499-scissor-benchmark.md`: independently inventoried eight reported historical individual slopes and exclusive three-gauge observable; a missing TS1 web modulus remains unresolved. |
| 4 Geometry evidence | `usda-fpl-rp-499-scissor-geometry-hold.md`: primary source caption verifies family and span; visual drawing/actual centerlines not retrieved and not replaced by generic coordinates. |
| 5 Setup evidence | `usda-fpl-rp-499-scissor-protocol-hold.md`: distinguish individual and assembly conditions, documented load-point spacing and held absolute positions, gauges and restraint. |
| 6 and root | Synthetic three-gauge noisy OLS benchmark (5,000 lb/in slope, 40 lb intercept), negative input and large-coordinate stability checks, exact integration and README. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. No historic test has been reproduced, and no fit grants design or fabrication authority.

**Next:** Advance a separate explicitly authored finite horizontal restraint diagnostic, with hand-tested free/finite/rigid boundary behavior. Do not assign a value to the historic rig or use its measured stiffness to fit any missing parameters. Keep pursuing exact specimen evidence only from verified sources.

## Batch 039 — 2026-11-22T06:18:01Z (UTC)

**Reviewed implementation:** [`f3e4729f0a1c13ea6623f9ac91a52bbea32180b4`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/f3e4729f0a1c13ea6623f9ac91a52bbea32180b4). Baseline `1c20005`: 610 passing. Full `npm run check`: **619 passed, 0 failed, 0 skipped**. Six isolated lanes.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `scissor-authored-release-comparison.ts` solves the same bounded weighted cases once per explicitly authored variant, returning selected member end actions, both local deflection references and a physical resultant. |
| 2 Geometry and connection inputs | `scissor-authored-release-variants.ts` and direct tests only change the two explicit end flags on the exact directed member. Geometry, supports, shear and section data remain detached and unchanged. |
| 3 Engineering evidence | Scope note explains why a determinate reaction balance cannot establish joint release, actual semi-rigid behavior, applicable limits or fabrication. |
| 4 Numerical verification | `scissor-authored-release-comparison-benchmark.test.mjs` keeps the same hand support reactions while an explicitly released top-panel end loses moment and its motion changes. |
| 5 QA | `scissor-authored-release-comparison-boundaries.test.mjs` holds all results for a late incompatible ridge couple and rejects changed identity, forged properties, repeated variants and invalid requests. |
| 6 and root verification | Direction/ordering and detached variant boundary checks, independent chord-relative simple-span UDL bending test on a scissor member released at both ends, and README. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Synthetic benchmarks test model behavior, not the stiffness of a real plate joint or a physical truss.

**Next:** Pin the geometry, support and loading scope of the published USDA FPL-RP-499 physical scissor specimens and its measured three-point stiffness observable. Reproduction remains held until the actual topology, boundary conditions, member properties and applied forces are accounted for without tuning to the observed result.

## Batch 038 — 2026-11-22T06:04:41Z (UTC)

**Reviewed implementation:** [`883aadeeb3382c6afd819f24fb4138713da66d53`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/883aadeeb3382c6afd819f24fb4138713da66d53). Baseline `21cb5d1`: 601 passing. Full `npm run check`: **610 passed, 0 failed, 0 skipped**. Six independently scoped lanes.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `scissor-authored-elastic-frame-study.ts`: bind one scissor family geometry to explicitly weighted frame reactions without implicit supports, loads or factors. |
| 2 Lumber/connection inputs | `scissor-authored-elastic-frame-model.ts`: complete exact per-directed-member A/I/E, both explicit rotations, optional paired shear; exact authored L/E supports; no size or fixity inferred. |
| 3 Engineering evidence | `scissor-elastic-frame-study-scope.md` and README distinguish axial pin-joint and bending frame assumptions, 50-ft scope, hand checks and remaining barriers. |
| 4 Geometry verification | `scissor-authored-elastic-frame-topology-boundaries.test.mjs`: eight joints and 13 directed members match the known level topology across both analyses; near-equal represented pitches with coincident members hold. |
| 5 Analytical verification | `scissor-authored-elastic-frame-study-benchmark.test.mjs`: two independent signed weighted bearing balances with elevated horizontal load, explicit couple and projected uniform top chord action. |
| 6 QA | `scissor-authored-elastic-frame-study-boundaries.test.mjs`: exact properties, supports, unsupported roof options, implicit or injected outputs and unused source targeting hold. |
| Root | `scissor-authored-elastic-frame-pin-limit.test.mjs`: at the 50-ft boundary, the explicitly all-released axial limit checks against hand reactions and the existing pin-jointed solver. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Geometry and model reaction agreement cover only the cases tested, not physical bearing, uplift, design or fabrication.

**Next:** Add a scoped, like-for-like scissor frame comparison of explicitly authored rotation assumptions and solved member/deflection diagnostics. Keep matched input identities and exclude implied joint stiffness, generalized project loads, allowable design values or release.

## Batch 037 — 2026-11-22T05:48:58Z (UTC)

**Reviewed implementation:** [`e225935f614226a16f1e722d42fba43d70ffb932`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/e225935f614226a16f1e722d42fba43d70ffb932). Baseline `f19206e`: 592 passing. Full `npm run check`: **601 passed, 0 failed, 0 skipped**. Six isolated engineering, analysis evidence and test lanes.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `elastic-frame-authored-combination-reactions.ts`: solve each explicitly weighted case on one detached frame, preserving source references and outputting no cached actions. |
| 2 Lumber/inputs | `elastic-frame-authored-source-targets.ts` and combination stress wrapper reconcile unused source target and directed-station checks across stress and reaction views. |
| 3 Connector plates/evidence | USDA reference note separates modeled ideal restraints and physical force/moment arithmetic from actual bearing, connections, slip or release. |
| 4 Geometry | `elastic-frame-physical-resultant.ts` and tests: separate global forces and direct couples, true loaded measure, directed interior stations and support reactions about a named node; numerical and tangent checks. |
| 5 Numerical verification | `elastic-frame-authored-combination-reactions-benchmark.test.mjs`: inclined cantilever at two origins and independent pin/roller force and lever arms. |
| 6 QA | `elastic-frame-authored-combination-reactions-boundaries.test.mjs`: exact frame, origin, source target, untrusted payload and no release claims. |
| Root | Integrated, added representable large-coordinate translation and inclined-restraint benchmark `elastic-frame-combination-reactions-oriented-benchmark.test.mjs`, updated README, confirmed unchanged safety gates. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. Modeled reaction balance is not qualified engineering or proof of real support behavior.

**Next:** Audit one whole supported truss family from exact roof geometry to explicit applied loads and solved support demand. Prefer scissor geometry as a distinct validation target, and use independent force/moment checks without inferring site loads, capacity, member selection or shop readiness.

## Batch 036 — 2026-11-22T05:33:17Z (UTC)

**Reviewed implementation:** [`7725acafde766c751308fe05d9d8d265058df715`](https://github.com/jasonwineinger-cmd/Woodtruss/commit/7725acafde766c751308fe05d9d8d265058df715). Baseline `8923593`: 582 passing. Full `npm run check`: **592 passed, 0 failed, 0 skipped**. Six isolated engineering, quality and evidence lanes.

| Worker | Completed scope and changed files |
| --- | --- |
| 1 Structural | `elastic-frame-authored-combination-receipt.ts`: input-only versioned receipt from a freshly solved detached snapshot; no output cache. |
| 2 Lumber | `elastic-frame-authored-combination-replay.ts`: compare the entire envelope to independently supplied expected inputs, then perform one fresh solve. No changed input or result read from the submitted receipt. |
| 3 Connector plates/evidence | USDA reference note now separates canonical reproducibility from source trust, capacities, code and release. |
| 4 Geometry/data | `elastic-frame-reviewed-plain-data.ts` and tests maintain authored array order, finite values and exact directed frame/action data; sort record keys; detached deep freeze with explicit numeric zero normalization. |
| 5 Verification | `elastic-frame-authored-combination-review-benchmark.test.mjs`: independent weighted beam stress and same-cut actions after a JSON round trip, plus rejection of a changed directed point lever arm. |
| 6 Integration | `elastic-frame-authored-combination-review-boundaries.test.mjs`: forged metadata, stale or reordered inputs, getter, nonfinite and sparse data rejection and immutability. |
| Root | Review, exact tree integration, aggregate text limit and README; 50-foot cap and fabrication lock unchanged. |

**Estimates, unchanged:** lumber **20%**, plates **20%**, geometry/analysis **40%**, optimization **20%**, manufacturing/Panelizer **20%**. A matching receipt is not an authenticated source, signed engineering, or proof of code compliance.

**Next:** Add a scoped reproducible load-resultant/reaction statement with independent analytical checks and retain it as a solved diagnostic only. Continue code, lumber and connector data research from authoritative sources; do not fill the gaps with inferred defaults.

Earlier records: [Batches 001 through 020](docs/development-history-batches-001-020.md) and [Batches 021 through 035](docs/development-history-batches-021-035.md).
