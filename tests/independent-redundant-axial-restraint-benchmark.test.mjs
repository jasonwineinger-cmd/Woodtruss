import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePinJointedTruss } from '../dist/analysis/src/index.js';

const model = {
  nodes: [{ id: 'A', x: 0, y: 0 }, { id: 'B', x: 40, y: 0 }, { id: 'C', x: 140, y: 0 }],
  bars: [
    { id: 'AB', a: 'A', b: 'B', areaIn2: 1, elasticModulusPsi: 8e5 },
    { id: 'BC', a: 'B', b: 'C', areaIn2: 3, elasticModulusPsi: 1e6 },
  ],
  loads: [{ nodeId: 'B', fxLb: 1250 }],
  supports: [
    { nodeId: 'A', fixX: true, fixY: true }, { nodeId: 'B', fixX: false, fixY: true },
    { nodeId: 'C', fixX: true, fixY: true },
  ],
};

function close(actual, expected, label, tolerance = 1e-8) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) < tolerance,
    `${label}: expected ${expected}, received ${actual}`);
}

test('compatibility divides load unequally between dissimilar members at two fixed ends', () => {
  // K_AB=20,000 and K_BC=30,000 lb/in. One common B movement stretches
  // AB and shortens BC by equal amounts. Statics alone cannot partition
  // the end reactions. Compatibility yields uB = 1250 / (20000+30000).
  const out = analyzePinJointedTruss(model);
  close(out.displacementIn.B.x, 0.025, 'loaded joint movement', 1e-12);
  close(out.displacementIn.A.x, 0, 'left end held', 1e-12);
  close(out.displacementIn.C.x, 0, 'right end held', 1e-12);
  close(out.axialForceLb.AB, 500, 'AB tension');
  close(out.axialForceLb.BC, -750, 'BC compression');
  close(out.reactionLb.A.x, -500, 'left reaction');
  close(out.reactionLb.C.x, -750, 'right reaction');
  close(out.residualForceLb, 0, 'force residual');
});

test('releasing the right longitudinal restraint unloads BC without a hidden horizontal reaction', () => {
  const released = { ...model, supports: model.supports.map(s => s.nodeId === 'C'
    ? { ...s, fixX: false } : s) };
  const out = analyzePinJointedTruss(released);
  // C's free-body has no external force, so BC must carry zero. B and C
  // move together, while AB alone carries 1250 lb and stretches 0.0625 in.
  close(out.displacementIn.B.x, 0.0625, 'B movement', 1e-12);
  close(out.displacementIn.C.x, 0.0625, 'C movement', 1e-12);
  close(out.axialForceLb.AB, 1250, 'AB tension');
  close(out.axialForceLb.BC, 0, 'BC unloaded');
  close(out.reactionLb.A.x, -1250, 'left reaction');
  close(out.reactionLb.C.x, 0, 'released direction');
});
