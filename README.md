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

Invalid arguments return a nonzero exit status. The preview always prohibits fabrication; it does not produce cut lists, plate selections, permit drawings, or machine instructions. Run `npm run check` to type-check, build, and run the tests.
