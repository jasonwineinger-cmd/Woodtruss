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
- `packages/geometry`: deterministic, unit-aware geometry models
- `packages/analysis`: independently benchmarked structural solver
- `packages/lumber`: code-edition-specific lumber design rules
- `packages/connectors`: tested manufacturer plate catalogs and joint checks
- `packages/fabrication`: cut lists, dimensions, jig data and inspection records
- `packages/contracts`: versioned, read-only integration contract for Prefab Panelizer
- `apps/web`: interactive truss editor
- `apps/api`: application API

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
