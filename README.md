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

Invalid arguments return a nonzero exit status. The preview always prohibits fabrication; it does not produce cut lists, plate selections, permit drawings, or machine instructions. Run `npm run check` to type-check, build, and run the tests.
