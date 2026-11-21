import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePinJointedTruss } from '../dist/analysis/src/index.js';

function near(actual, expected, label, tolerance = 1e-7) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`);
}

test('settlement-free axial displacement field rotates with a translated, fully pinned support frame', () => {
  // Orthogonal 100-in AB and 150-in CB bars give a closed-form result at B.
  // B's independent axial springs are 20,000 lb/in each. Therefore
  // uB=360/20000=0.018 in, vB=-820/20000=-0.041 in.
  // A and C react in their individual axial directions, with zero motion.
  // In any rigid in-plane rotation R, end displacement vectors and reactions
  // rotate by R, while the dot products defining axial extension are unchanged.
  const originalNodes = [{ id: 'A', x: -100, y: 0 }, { id: 'B', x: 0, y: 0 }, { id: 'C', x: 0, y: -150 }];
  const supports = ['A', 'C'].map(nodeId => ({ nodeId, fixX: true, fixY: true }));
  const expectedReactions = { A: [-360, 0], C: [0, 820] };
  const expectedDisplacements = { A: [0, 0], C: [0, 0], B: [0.018, -0.041] };

  for (const [cos, sin, dx, dy, reverseMemberEnds] of [
    [1, 0, 0, 0, false], [3/5, 4/5, 430, -271, false], [-5/13, -12/13, -630, 190, true],
  ]) {
    const rotate = (x, y) => [cos*x - sin*y, sin*x + cos*y];
    const [fxLb, fyLb] = rotate(360, -820);
    const bars = [{ id: 'AB', a: 'A', b: 'B', areaIn2: 2, elasticModulusPsi: 1e6 },
      { id: 'CB', a: 'C', b: 'B', areaIn2: 3, elasticModulusPsi: 1e6 }]
      .map(bar => reverseMemberEnds ? { ...bar, a: bar.b, b: bar.a } : bar);
    const nodes = originalNodes.map(({ id, x, y }) => {
      const [rx, ry] = rotate(x, y);
      return { id, x: rx + dx, y: ry + dy };
    });
    const out = analyzePinJointedTruss({ nodes, bars, loads: [{ nodeId: 'B', fxLb, fyLb }], supports });
    near(out.axialForceLb.AB, 360, 'AB tension');
    near(out.axialForceLb.CB, -820, 'CB compression');
    for (const [id, vector] of Object.entries(expectedReactions)) {
      const [x, y] = rotate(...vector);
      near(out.reactionLb[id].x, x, `${id} reaction x`);
      near(out.reactionLb[id].y, y, `${id} reaction y`);
    }
    for (const [id, vector] of Object.entries(expectedDisplacements)) {
      const [x, y] = rotate(...vector);
      near(out.displacementIn[id].x, x, `${id} displacement x`, 1e-10);
      near(out.displacementIn[id].y, y, `${id} displacement y`, 1e-10);
    }
    near(out.residualForceLb, 0, 'force residual');
  }
});
