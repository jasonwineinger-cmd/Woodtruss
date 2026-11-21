import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePinJointedTruss } from '../dist/analysis/src/index.js';

const nodes = [
  { id: 'A', x: 0, y: 0 }, { id: 'B', x: 120, y: 0 }, { id: 'C', x: 240, y: 0 },
  { id: 'D', x: 60, y: 80 }, { id: 'E', x: 180, y: 80 }, { id: 'F', x: 120, y: 120 },
];
const ea = 2e6;
const model = {
  nodes,
  bars: ['AB', 'BC', 'AD', 'DF', 'EF', 'EC', 'DB', 'FB', 'EB'].map(id => ({
    id, a: id[0], b: id[1], areaIn2: 2, elasticModulusPsi: 1e6,
  })),
  loads: [{ nodeId: 'D', fyLb: -1200 }, { nodeId: 'F', fyLb: -600 }],
  supports: [{ nodeId: 'A', fixX: true, fixY: true }, { nodeId: 'C', fixX: false, fixY: true }],
};

function near(actual, expected, label, tolerance = 1e-7) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, got ${actual}`);
}

test('off-center gable station load matches hand joints, reactions and virtual deflection', () => {
  const out = analyzePinJointedTruss(model);
  // Taking moments about pin A: 240*Cy = 60*1200 + 120*600. The free
  // horizontal roller cannot react in x, and no horizontal load acts.
  near(out.reactionLb.A.x, 0, 'pin horizontal reaction');
  near(out.reactionLb.C.x, 0, 'roller horizontal reaction');
  near(out.reactionLb.A.y, 1200, 'pin vertical reaction');
  near(out.reactionLb.C.y, 600, 'roller vertical reaction');

  const s = Math.sqrt(13);
  // Joints A/C determine the outer slopes and bottom chords first.
  // At D: 3*DF/s + (3/5)*DB + 900=0 and 2*DF/s - (4/5)*DB=0.
  // At E: -3*EF/s - (3/5)*EB - 450=0 and 2*EF/s - (4/5)*EB + 600=0.
  // The apex F then gives its vertical tie by summing vertical components.
  const force = { AB: 900, BC: 450, AD: -1500, DF: -200*s, EF: -200*s, EC: -750, DB: -500, FB: 200, EB: 250 };
  for (const [id, expected] of Object.entries(force)) near(out.axialForceLb[id], expected, `${id} force`);

  // Independently repeat joint equilibrium with unit DOWN load at D only:
  // A_y=3/4, C_y=1/4. The resulting virtual member forces and geometric
  // lengths give work-equivalent downward deflection, sum(N*n*L/EA).
  const virtual = {
    AB: [9/16, 120], BC: [3/16, 120], AD: [-15/16, 100],
    DF: [-s/12, 20*s], EF: [-s/12, 20*s], EC: [-5/16, 100],
    DB: [-25/48, 100], FB: [1/3, 120], EB: [5/48, 100],
  };
  const downAtD = Object.entries(virtual).reduce((total, [id, [n, length]]) => total + force[id]*n*length/ea, 0);
  near(out.displacementIn.D.y, -downAtD, 'D vertical displacement', 1e-10);
  near(out.residualForceLb, 0, 'global residual');
});

test('deleting the loaded station web leaves a mechanism despite an intact outer gable outline', () => {
  // The pin/roller restraint scheme is unchanged. Removing DB takes away
  // one independent constraint of this determinate model; visual continuity
  // of the outer chord cannot supply the missing web stiffness.
  const unsafe = { ...model, bars: model.bars.filter(bar => bar.id !== 'DB') };
  assert.throws(() => analyzePinJointedTruss(unsafe), /singular|unstable/i);
});
