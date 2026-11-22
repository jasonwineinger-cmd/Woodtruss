# Woodtruss

Independent wood-truss design and manufacturing application, intended for eventual integration into Prefab Panelizer.

## Scope
- 8–50 ft design spans
- Residential common/hip/mono, attic, scissor, and agricultural truss families
- Parametric geometry, load cases, member analysis, lumber checks, connector plate checks, fabrication drawings, and production data
- Separate dependency graph, CI, engineering verification, and release lifecycle

## Safety and engineering release gates
**This repository is not currently capable of producing approved truss designs.** Geometry or preliminary analysis must never be presented as a certified truss design. Fabrication release requires verified structural calculations, applicable code checks, validated plate capacities, engineering review, and manufacturing quality controls.

## Architecture

Implemented packages are preliminary:

- `packages/geometry`: deterministic geometric references and selected truss topologies
- `packages/analysis`: idealized 2D solver, explicit load cases and numerical benchmarks
- `packages/lumber`: reference provenance, schematic stock and demand screening; not NDS design
- `packages/connections`: joint demand and connector-reference review; no plate capacities or selection
- `packages/fabrication`: schematic lengths, watermarked previews, revision QA and identity-only handoff
- `packages/contracts`: preliminary data contracts and the fail-closed fabrication gate

Interactive web editor, API, and production workflows are future work. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for the tested scope.

## Integration strategy
No runtime imports from Prefab Panelizer or TrussForge. Export a versioned, documented JSON design package with units, geometry, reactions, material selections, design status, warnings, and revision IDs. Prefab Panelizer must reject unapproved designs for manufacturing.

## Open-source research candidates (review licensing before reuse)
- https://github.com/cmccomb/TrussMe — Python truss optimization, MIT
- https://github.com/PetrKryslUCSD/pystran — truss and beam solver reference
- https://github.com/Batuis/dedaliano-1 — TypeScript direct-stiffness solver reference
- https://github.com/gramaziokohler/compas_timber — timber fabrication and geometry concepts

Do not copy GPL/AGPL or other copyleft code into this project without a deliberate licensing decision. Structural solver examples are research/benchmark references, not substitutes for design verification.

## Immediate milestones
1. Repository scaffold, tests, CI, unit conventions, schema and deterministic geometry.
2. Structural solver with benchmark fixtures and reactions/deflection tests.
3. Lumber and connection engineering with documented assumptions and validation.
4. Shop drawings, cut lists, production data, and controlled Prefab Panelizer integration.

## Run locally

This repository currently runs a command-line preview, not a browser app. From the repository folder with Node.js 22 and npm:

```sh
npm install
npm start
```

The default example solves a 30 ft common truss at 6:12 with a single illustrative 1,000 lb ridge point load and prints a preliminary JSON package. It is not a project load case or a truss design. To preview a different span and pitch (span 8–50 ft, pitch greater than zero and at most 18:12):

```sh
npm start -- --span-ft 24 --pitch 5
```

Select the mono demo with `npm start -- --family mono`. Its separate synthetic 1,000 lb point load acts at the first upper joint, one quarter of the span from the low bearing. Neither demonstration derives site or code loads. No other built-in demos are available.

To save only the JSON, without npm's command banners:

```sh
npm start --silent -- --span-ft 24 --pitch 5 > woodtruss-preview.json
```

For a picture, write a visibly watermarked, dimensionless review diagram. The SVG is normalized to a generic viewport and is not a shop drawing or a scaled pattern:

```sh
npm start --silent -- --family mono --format svg > woodtruss-preview.svg
```

Run `npm start --silent -- --capabilities` to see the demo families, formats, span limit and supported authored point-load variants. These variants do not constitute complete truss designs.

To run a single **authored, preliminary point-load study**, save a JSON input such as the following synthetic agricultural tied-gable example to `authored-case.json`:

```json
{
  "schemaVersion": "woodtruss.authored-point-load-input.v1",
  "variant": "agricultural-tied-gable",
  "roof": { "family": "agricultural", "spanFt": 40, "pitchRisePer12": 4 },
  "areaIn2": 5.25,
  "elasticModulusPsi": 1000000,
  "loadCase": {
    "id": "example-1",
    "description": "Illustrative signed forces, not project loads",
    "jointLoads": [{ "nodeId": "Q1", "fyLb": -1600 }, { "nodeId": "Q3", "fxLb": 100, "fyLb": 400 }]
  }
}
```

```sh
npm start --silent -- --explicit-point-load < authored-case.json
```

The JSON result repeats the input, modeled geometry, joint movements, reactions, axial forces and equilibrium checks. Positive force is rightward or upward, in pounds. Each existing joint can appear once. The agricultural variant is limited to its flat-bottom, level-bearing centerline model with no raised heel or overhang. No site loads, purlin distribution, design properties, allowable capacities or fabrication approval are inferred. Use the modeled node IDs, not drawing marks or field locations.

For an attic **geometry-only** fit check, supply all four values:

```sh
npm start --silent -- --attic-clearance --span-ft 40 --pitch 8 --room-width-ft 12 --room-height-ft 8
```

The result compares ideal centerlines with a centered rectangular room under a level, symmetric, zero-heel roof. It does not account for member thickness or finishes, solve the attic structure or floor, or authorize fabrication.

A separate **generic double-Fink-style centerline reference** is available for a symmetric, flat-bottom gable without overhangs or heel offsets:

```sh
npm start --silent -- --double-fink-reference --span-ft 32 --pitch 5
```

This is an eight-panel geometry reference, not a reproduction of any manufacturer's layout. It does not analyze a truss, place plates, or validate installed geometry.

### Analyze an independently specified member graph

`--authored-model` is for a manually supplied, ideal pin-jointed graph, not a PDF importer. It accepts one case and does not fill in missing coordinates, stiffnesses, loads, brackets, bearings, or connections. Save a complete input such as this synthetic example and pass it on standard input:

```json
{
  "schema": "woodtruss-authored-model/v1",
  "units": { "length": "in", "force": "lb", "area": "in^2", "elasticModulus": "psi" },
  "modelId": "synthetic-triangle",
  "modelRevision": "class-example",
  "provenance": "Hand-authored synthetic graph",
  "bearings": { "leftNodeId": "L", "rightNodeId": "R" },
  "model": {
    "nodes": [{ "id": "L", "x": 0, "y": 0 }, { "id": "R", "x": 120, "y": 0 }, { "id": "T", "x": 60, "y": 30 }],
    "bars": [
      { "id": "tie", "a": "L", "b": "R", "areaIn2": 2, "elasticModulusPsi": 250000 },
      { "id": "left", "a": "L", "b": "T", "areaIn2": 3, "elasticModulusPsi": 300000 },
      { "id": "right", "a": "T", "b": "R", "areaIn2": 4, "elasticModulusPsi": 350000 }
    ]
  },
  "loadCase": {
    "id": "demo",
    "description": "One named point load",
    "provenance": "Hand-authored synthetic load",
    "jointLoads": [{ "nodeId": "T", "fyLb": -360 }]
  }
}
```

```sh
npm start --silent -- --authored-model < authored-model.json
```

The modeled left bearing is a pin and the right bearing a vertical roller at the same elevation, 8–50 ft apart. Joints outside that span and malformed or unstable input are rejected. Each bar keeps its own supplied area and elastic modulus; none is a material recommendation. Results include preliminary displacements, reactions and axial forces and are not a substitute for the independent reference or a design approval. Keep private source drawings and their transcribed inputs out of version control.

### Independent checks

- The numerical suite replays [Jönköping University’s pin-and-roller example](https://mechanics.ju.se/SolidMechanics/TrussAnalysis.html#example-2-a-larger-structure), comparing the published member forces, translations and roller reaction. This checks the idealized static solver, not a built wood truss.
- The [USDA 6M3 source review](docs/references/usda-fpl492-6m3-evidence.md) identifies a measured 28-ft timber-truss specimen and exactly which published quantities are comparable. No physical-model match is claimed. An isolated beam deflection benchmark is also kept separate from the truss solver; it does not add chord bending or connection slip to truss results.
- The [USDA Purdue frame example](docs/references/usda-ppsa-example-scope.md) checks global forces and moments for the printed load case. Explicit horizontal projection agrees with the published totals; sloped lengths do not. This is not a frame stiffness solve or a general load-basis rule.
- A separate library-only elastic frame solver supports prismatic axial-and-bending members with rigid ends or explicitly authored ideal end rotation releases under explicit global nodal actions and ideal Cartesian or inclined restraints. It also accepts one full-length uniform global force per member, per inch of actual length or nonzero horizontal projection, and one concentric global point force at an explicit interior station measured from the ordered member start. No demand is inferred from codes or pitch. Analytical bent-cantilever, uniformly loaded simple-beam and inclined-cantilever checks cover nodal displacements, reactions and stability. The inclined restraint constrains the normal to the authored tangent in both directions; it does not model seating, uplift separation, friction or settlement. The solver recovers each member’s local node-on-member end forces and moments and checks them against physical load and joint balance. The library reports bounded between-end axial, shear and bending extrema from independent section cuts at endpoints, on both sides of a point force, and at interior zero-shear locations. Optional `memberSectionCuts` asks for a signed axial, shear and moment vector at the same exact ordered station and in the same solved state. At the actual point force request `left` and/or `right` explicitly; every other station (including endpoints) takes `continuous`. No neighboring coordinate is snapped to that force. Requested cuts do not change the component extrema; unrelated component maxima must not be combined into a section vector. These are modeled demands, not physical connector forces, wood capacity or a combined design check. The separate library-only `studyElasticFrameRectangularCut` re-solves one supplied frame and evaluates elastic normal stress at the positive and negative local depth faces of one selected cut. An explicitly authored unnotched rectangle must reproduce the solved gross area and inertia about the width axis to arithmetic precision. It uses only the coincident signed axial force and moment (the other bending axis is absent in the planar model); signed shear is carried separately as a force, not a shear stress or capacity. This comparison does not check material properties, governing stress elsewhere, code allowables, stability, connections, member selection or fabrication. For one solved frame state, opt-in `memberRectangularStressExtrema` separately locates the signed low and high normal stresses along each local depth face. It checks the member ends, both sides at the actual force jump, and stationary candidates on each supported load branch. Each result carries the same-cut force and moment. These single-state numerical extrema need not occur at peak bending and do not compare stress to an allowable. The separate library-only `studyAuthoredElasticFrameStressCases` re-solves a bounded ordered list of explicitly authored load states on one unchanged frame and section selection. Its signed per-face comparison retains the winning state, station, point side, and the original same-cut axial force, shear and moment. Equal values keep the first authored case. The model and case labels are supplied identifiers, not authenticity or completion proof. The comparison covers only the supplied states, with no code combinations, site loads, capacities, lumber selection or release. For an explicitly weighted input, the library-only `studyAuthoredElasticFrameCombinationStress` accepts only named cases with caller-supplied signed factors and references. It combines the physical loads before re-solving, keeps original term order, and never weights previous stress extrema. Uniform loads for one member must share the same intensity basis and point loads for one member must share the exact ordered station; incompatible loads are held. No implied base action, automatic code factor, physical verification of references, or release is provided. Optional `memberDisplacementStations` requests return local axial and transverse translations (inches) and CCW section rotation (radians) at distinct selected distances from the ordered start, up to 64 per member. They integrate the modeled physical loads from the recovered start values and must close independently at the recovered far end, including private released rotations. Local translation follows the signed member axes. Those samples are small model motions, not measured deflection. The separate opt-in `memberDeflectionExtrema` reports signed local transverse minima and maxima both as modeled and relative to the straight line through the displaced member ends over the original local axis. It checks both ends, the exact point-force station (including a possible shear slope jump), and interior stationary points on each bounded load branch. Roots use the represented coefficients; an unresolved station fails closed. These are single-state numerical extrema, not a governing design-case envelope, a global bearing datum, a code decision, or structural approval. Partial/nonuniform distributed loads, eccentric forces and point couples along members are not supported. A separately explicit shear-flexible option uses authored shear modulus and effective shear area for rigid members, with dedicated full-length uniform and concentric interior point actions. Explicit ideal end releases now condense both the shear stiffness and that same applied load vector, with separate private rotation recovery. No lumber property, design value or actual connector fixity is inferred. Member releases do not release the whole joint. If all incident ends release a joint rotation, it is reported as null and cannot carry an applied nodal couple or rotational restraint. A member’s own released section rotation is recovered separately; zero end moment does not imply zero bending between ends. The [USDA output-reference note](docs/references/usda-ppsa-frame-output-scope.md) keeps its coordinate conventions and remaining comparison gaps explicit.

The separate library-only combination review receipt captures detached JSON-compatible inputs, not cached results. Replay compares the complete scoped input to independently obtained expected inputs before a fresh solve. Object key order is canonicalized, authored array order is retained, and signed numeric zero is normalized for JSON. Matching receipts do not authenticate the author, satisfy code requirements, approve fabrication, or establish a bridge to production exports.

The separate library-only `studyAuthoredElasticFrameCombinationReactions` reports signed physical nodal, uniform and point actions and solved ideal-support reactions for each explicit weighted case, about one named node in that model. Uniform intensity uses its stated measure; interior point stations use the ordered member axis. Counterclockwise moments include direct couples and relative lever arms. Support rows are reactions on that ideal frame, not member-end actions, wood bearing transfer or available capacity. No site code combinations, structural approval, or fabrication release are generated.

The library-only `studyAuthoredScissorElasticFrameReactions` connects the level-bearing scissor centerline family to that signed reaction study. Supply the exact directed member assignments (area, elastic modulus, inertia, both end-rotation choices, and optional paired shear data) and explicitly authored ideal L/E support definitions. The bounded 50-ft geometry uses no raised heels or overhangs, and nothing infers lumber, releases, supports, site loads or factors. A [scissor study note](docs/references/scissor-elastic-frame-study-scope.md) distinguishes the new elastic diagnostic from the older pin-joint idealization; neither authorizes fabrication.

The companion `compareAuthoredScissorElasticFrameReleases` independently solves two to six explicit configurations against the same bounded authored cases and selected member IDs. Only directed end-release flags may differ; each response preserves the case, variant source, signed member end actions, both local deflection references, and the physical resultant from the same solve. A failed state holds the whole comparison. Indistinguishable support reactions do not establish actual joint fixity or acceptable deflection.

The library-only `studyElasticFrameHorizontalRestraint` compares an explicitly named existing Y-only roller with one authored free, finite bilateral spring, or rigid horizontal diagnostic. One separate unit-load solve establishes flexibility; an equivalent horizontal force is injected into a re-solve with no support substitution. The report separates that force from original support reactions. See the [restraint scope](docs/references/elastic-horizontal-restraint-study-scope.md); it does not establish actual support, fixture, connection, bearing or fabrication behavior.

The independent `studyObservedScissorThreeGaugeStiffness` reduces three signed displacement observations and two vertical bearing reactions per recorded step, then fits slope and intercept across an explicitly selected loading window. The [USDA physical benchmark intake](docs/references/usda-fpl-rp-499-scissor-benchmark.md) documents a comparable observable and why the reported specimen has not been reproduced. Synthetic arithmetic checks are not physical validation or lumber/plate evidence.

The separate `studyScissorModeledThreeGaugeRestraint` projects the modeled global vertical displacements at the three explicitly bound scissor nodes before and after one authored horizontal restraint. Each weighted case carries its signed vertical bearing reactions. The [modeled gauge scope](docs/references/scissor-modeled-gauge-restraint-scope.md) keeps those predictions separate from measured observations, slopes, historic test reproduction and design approval.

The review-only `compareScissorModeledAndObservedResponse` requires explicit ordered step, gauge and bearing bindings for one identified specimen, test and exact model revision before it reports signed residuals. The caller declares a diagnostic reaction tolerance, which checks each bearing and the total, not design adequacy. See [correspondence scope](docs/references/scissor-model-observation-correspondence-scope.md); nothing authenticates references, calibrates the model, enrolls the historic specimen or permits fabrication.

The lumber documentation check separates the NDS rules from the matching edition's Supplement and from each publication's own updates. It compares exact caller-supplied identities and holds stock or factor evidence cited from the wrong role, including older single-document submissions. See the [controlled AWC publication scope](docs/references/awc-2024-lumber-publication-boundary.md). A metadata match is not publisher verification, a license check, proof of applicability, or authority to design or fabricate.

The local-only companion `reviewLumberIntakeWithEditionEvidence` checks caller-supplied private bytes for both publications and their declared updates. It also checks the complete six existing reference-quantity receipts against independently declared Supplement artifact IDs for the same stock row. It does not read table contents, verify licenses, add perpendicular-to-grain compression, establish member fit, or authorize structural use.

The library-only `reviewDatedLocalPlateReport` compares an independently expected issuer observation for an explicit day with exact product/report metadata and supplied authorized local bytes. A printed continuous window and a month-only renewal statement are not interchangeable. See the [TPI and ESR-1988 source scope](docs/references/tpi-2022-mitek-esr-1988-plate-source-boundary.md). The check does not contact the issuer, authenticate current status, select a plate or press, or verify capacity or release.

The library-only `reviewScopedPlateReportEvidence` adds separate product-mark and box-reference roles, resistance mechanism, process, section basis, denominator and orientation categories to the dated report check. It does not turn a label index into a product report or a source match into a plate capacity. See the [connector source boundary](docs/references/plate-resistance-mechanism-and-label-boundary.md).

The library-only `reviewJobTrussInspectionIntake` compares one independently specified job, truss and design revision with separate inspection and signature references and the expected joint faces. A reported correction closure is held without independent reinspection. See the [TPI form scope](docs/references/tpi-in-plant-inspection-evidence-boundary.md). This does not validate a signature, confirm an inspection, approve shipment or change the fabrication lock.

The library-only `studyAuthoredMonoElasticFrameReactions` replays signed combinations on the exact four-bay mono centerline graph with explicit member stiffness, end releases and ideal bearings. See the [mono study scope](docs/references/mono-authored-elastic-frame-scope.md). Horizontal-projected and actual-member intensity are independent measures; there is no site loading, design selection or fabrication approval.

The library-only `studyAuthoredMonoElasticFrameDisplacements` takes named joints and ordered member stations from the same authored mono model. Fresh signed weighted solves keep global joint motion separate from private local section rotation and translation. See the [displacement scope](docs/references/mono-authored-displacement-scope.md). Selected samples are not a fit to measurements, a design envelope, or fabrication evidence.

Invalid arguments return a nonzero exit status. The preview always prohibits fabrication; it does not produce cut lists, plate selections, permit drawings, or machine instructions. Run `npm run check` to type-check, build, and run the tests.
