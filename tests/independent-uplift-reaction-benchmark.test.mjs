import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePinJointedTruss } from '../dist/analysis/src/index.js';

const model = {
  nodes: [{ id: 'A', x: 0, y: 0 }, { id: 'B', x: 60, y: 80 }, { id: 'C', x: 140, y: 0 }],
  bars: ['AB', 'BC', 'AC'].map(id => ({
    id, a: id[0], b: id[1], areaIn2: 2, elasticModulusPsi: 1e6,
  })),
  loads: [{ nodeId: 'B', fxLb: 300, fyLb: 300 }],
  supports: [{ nodeId: 'A', fixX: true, fixY: true }, { nodeId: 'C', fixX: false, fixY: true }],
};

function near(actual, expected, label, tolerance = 1e-8) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`);
}

test('uplift plus lateral load reverses one support reaction while the other remains positive', () => {
  const out = analyzePinJointedTruss(model);
  // Moment about A: 140*Cy + 60*300 - 80*300 = 0. Force balance
  // gives Ay=-300-Cy and Ax=-300. Negative Ay is a model reaction,
  // not evidence that an installed support can resist uplift.
  near(out.reactionLb.A.x, -300, 'pin horizontal reaction');
  near(out.reactionLb.A.y, -2400/7, 'pin downward reaction');
  near(out.reactionLb.C.x, 0, 'roller horizontal reaction');
  near(out.reactionLb.C.y, 300/7, 'roller upward reaction');
  // At A, (4/5)*AB + Ay=0, and AC=300-(3/5)*AB.
  // At C, BC/sqrt(2) + Cy=0; negative means compression.
  near(out.axialForceLb.AB, 3000/7, 'left inclined member tension');
  near(out.axialForceLb.BC, -300*Math.SQRT2/7, 'right inclined member compression');
  near(out.axialForceLb.AC, 300/7, 'horizontal chord tension');

  // Hooke extensions are AB=3/140, BC=-3/875, AC=0.003 in. With
  // A held and C riding horizontally, (3/5)uB+(4/5)vB=3/140,
  // while (uC-uB+vB)/sqrt(2)=-3/875. Solve two projected motions.
  const bDropFromHorizontal = 0.003 + 3*Math.SQRT2/875;
  const xB = (3/140 + (4/5)*bDropFromHorizontal)/(7/5);
  near(out.displacementIn.B.x, xB, 'apex x displacement', 1e-10);
  near(out.displacementIn.B.y, xB-bDropFromHorizontal, 'apex y displacement', 1e-10);
  near(out.displacementIn.C.x, 0.003, 'roller x displacement', 1e-10);
  near(out.displacementIn.C.y, 0, 'roller y displacement', 1e-10);
  near(out.residualForceLb, 0, 'force residual');
});

test('releasing the downward reaction restraint is not a valid two-support uplift solution', () => {
  // This is not a unilateral contact model: withholding the vertical
  // restraint at A allows rigid rotation about C after a translation.
  const released = { ...model, supports: model.supports.map(s => s.nodeId === 'A' ? { ...s, fixY: false } : s) };
  assert.throws(() => analyzePinJointedTruss(released), /singular|unstable/i);
});
