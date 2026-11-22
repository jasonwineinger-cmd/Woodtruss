import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePinJointedTruss } from '../dist/analysis/src/index.js';
import { distributeExplicitMemberChainLineLoad } from '../dist/analysis/src/member-chain-line-load.js';
import { aggregateExplicitNodalLoadChannels } from '../dist/analysis/src/load-source-aggregation.js';

// Synthetic trapezoid with one pin and one ideal vertical roller; coordinates
// are translated deliberately so the moment datum must be defined at A.
const model = {
  nodes: [
    { id: 'A', x: -45, y: 27 }, { id: 'B', x: 75, y: 27 }, { id: 'C', x: 195, y: 27 },
    { id: 'D', x: 15, y: 107 }, { id: 'E', x: 135, y: 107 },
  ],
  bars: ['AB', 'BC', 'AD', 'DB', 'DE', 'BE', 'EC'].map(id => ({
    id, a: id[0], b: id[1], areaIn2: 2, elasticModulusPsi: 1e6,
  })),
  supports: [{ nodeId: 'A', fixX: true, fixY: true }, { nodeId: 'C', fixX: false, fixY: true }],
};
const roof = {
  orderedNodeIds: ['A', 'D', 'E', 'C'], orderedMemberIds: ['AD', 'DE', 'EC'],
  fromIn: 25, toIn: 140, from: { fxLbPerIn: 0.75, fyLbPerIn: -2 },
  to: { fxLbPerIn: 0.75, fyLbPerIn: -2 }, provenance: 'Unrelated synthetic roof path',
};
const bottom = {
  orderedNodeIds: ['A', 'B', 'C'], orderedMemberIds: ['AB', 'BC'],
  fromIn: 80, toIn: 210, from: { fxLbPerIn: 0, fyLbPerIn: -1.5 },
  to: { fxLbPerIn: 0, fyLbPerIn: -1.5 }, provenance: 'Unrelated synthetic lower path',
};

function near(actual, expected, label) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) < 1e-7,
    `${label}: expected ${expected}, received ${actual}`);
}

test('different roof and bottom traveled intervals share one bearing datum and retain their moments', () => {
  const upper = distributeExplicitMemberChainLineLoad(model, roof);
  const lower = distributeExplicitMemberChainLineLoad(model, bottom);
  const loads = aggregateExplicitNodalLoadChannels(model, [
    { id: 'roof', provenance: roof.provenance, loads: upper.jointLoads },
    { id: 'bottom', provenance: bottom.provenance, loads: lower.jointLoads },
  ]);
  // Centroids of the two uniform roof fragments are at local (37.5,50)
  // and (80,80); the bottom fragment has a single centroid at (145,0).
  // Their independent resultants are (56.25,-150), (30,-80), (0,-195).
  const expectedMoment = 37.5*(-150) - 50*56.25 + 80*(-80) - 80*30 + 145*(-195);
  const reaction = -expectedMoment / 240;
  near(expectedMoment, -45512.5, 'hand moment about bearing A');
  const out = analyzePinJointedTruss({ ...model, loads: loads.jointLoads });
  near(out.reactionLb.A.x, -86.25, 'pin horizontal reaction');
  near(out.reactionLb.C.x, 0, 'roller horizontal reaction');
  near(out.reactionLb.A.y, 425-reaction, 'left vertical reaction');
  near(out.reactionLb.C.y, reaction, 'right vertical reaction');
  near(out.residualForceLb, 0, 'equilibrium residual');

  // Independent interpolation of the uniform bottom fragments: 60 lb
  // acts at station 100 on AB, and 135 lb at station 45 along BC.
  // At B this is -50-84.375. Roof contributes nothing at that lower joint.
  near(loads.jointLoads.find(load => load.nodeId === 'B')?.fyLb, -134.375, 'bottom-only station contribution');
  assert.equal(upper.jointLoads.some(load => load.nodeId === 'B'), false);
});

test('a terminal station valid on the longer roof path is not valid on the shorter bottom path', () => {
  // Both paths share bearings 240 in apart, but AD+DE+EC travels 320 in
  // and AB+BC only travels 240 in. Substituting span for either path fails.
  assert.doesNotThrow(() => distributeExplicitMemberChainLineLoad(model, { ...roof, toIn: 260 }));
  assert.throws(() => distributeExplicitMemberChainLineLoad(model, { ...bottom, toIn: 260 }), /interval/i);
});
