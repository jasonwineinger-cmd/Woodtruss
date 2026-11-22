import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePinJointedTruss } from '../dist/analysis/src/index.js';

const makeModel = (scale, vertical = false) => ({
  nodes: [
    { id: 'A', x: -31, y: 23 },
    { id: 'B', x: -31 + (vertical ? 0 : 48*scale), y: 23 + (vertical ? 60 : 36)*scale },
  ],
  bars: [{ id: 'AB', a: 'A', b: 'B', areaIn2: 2, elasticModulusPsi: 1e6 }],
  loads: [{ nodeId: 'B', fxLb: 640, fyLb: 300 }],
  supports: [{ nodeId: 'A', fixX: true, fixY: true }, { nodeId: 'B', fixX: false, fixY: true }],
});

function near(actual, expected, label, tolerance = 1e-8) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, got ${actual}`);
}

test('uniform length scaling at fixed EA preserves signed forces and scales horizontal compliance', () => {
  for (const scale of [1/8, 1, 29/4]) {
    const result = analyzePinJointedTruss(makeModel(scale));
    // L=60s, direction cosines 4/5 and 3/5. B's x-equilibrium gives
    // N(4/5)=640, hence N=800. The positive B_y reaction equals
    // N(3/5)-300. These force relations do not involve s.
    near(result.axialForceLb.AB, 800, 'axial tension');
    near(result.reactionLb.A.x, -640, 'A horizontal reaction');
    near(result.reactionLb.A.y, -480, 'A vertical reaction');
    near(result.reactionLb.B.x, 0, 'B horizontal freedom');
    near(result.reactionLb.B.y, 180, 'B vertical reaction');

    // FL/EA gives delta=0.024s in. Because B_y is fixed, the axial
    // elongation equals (4/5)u_B, so u_B=0.03s inches exactly.
    near(result.displacementIn.B.x, 0.03*scale, 'scaled free displacement', 1e-11);
    near(result.displacementIn.B.y, 0, 'fixed vertical displacement', 1e-11);
    near(result.residualForceLb, 0, 'force residual');
  }
});

test('length scaling cannot repair lost horizontal stiffness when the bar is vertical', () => {
  // Keeping the same distance, bar properties and supports while removing
  // the horizontal projection makes B_x a mechanism at every scale.
  for (const scale of [1/8, 1, 29/4]) {
    assert.throws(() => analyzePinJointedTruss(makeModel(scale, true)), /singular|unstable/i);
  }
});
