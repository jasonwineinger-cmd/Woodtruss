import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePinJointedTruss } from '../dist/analysis/src/index.js';

const halfSpan = 100, ea = 2e6, load = 0.02;
function fixture(rise, transpose = false) {
  // Full pins leave the same physical restraint after transposition.
  const nodes = [{ id: 'A', x: -halfSpan, y: 0 }, { id: 'B', x: 0, y: rise }, { id: 'C', x: halfSpan, y: 0 }]
    .map(node => transpose ? { ...node, x: node.y, y: node.x } : node);
  return {
    nodes, bars: ['AB', 'CB'].map(id => ({
      id, a: id[0], b: id[1], areaIn2: 2, elasticModulusPsi: 1e6,
    })),
    loads: [{ nodeId: 'B', ...(transpose ? { fxLb: -load } : { fyLb: -load }) }],
    supports: ['A', 'C'].map(nodeId => ({ nodeId, fixX: true, fixY: true })),
  };
}

function close(actual, expected, label, tolerance = 1e-10) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`);
}

test('shallow restrained V matches analytical compliance and its transposed movement', () => {
  for (const rise of [1, 2]) {
    const length = Math.hypot(halfSpan, rise);
    // Apex equilibrium: axial compression N times each vertical component
    // rise/L supports half the external load. Then Hooke axial shortening
    // N*L/(EA) is the apex motion projected by another rise/L.
    const force = -load*length/(2*rise);
    const apex = -load*length**3/(2*ea*rise**2);
    const side = load*halfSpan/(2*rise);
    for (const transpose of [false, true]) {
      const r = analyzePinJointedTruss(fixture(rise, transpose));
      const movement = transpose ? 'x' : 'y', perpendicular = transpose ? 'y' : 'x';
      close(r.displacementIn.B[movement], apex, 'apex compliance');
      close(r.displacementIn.B[perpendicular], 0, 'cross-axis apex motion');
      close(r.axialForceLb.AB, force, 'AB compression');
      close(r.axialForceLb.CB, force, 'CB compression');
      close(r.reactionLb.A[movement], load/2, 'A load-direction reaction');
      close(r.reactionLb.C[movement], load/2, 'C load-direction reaction');
      close(r.reactionLb.A[perpendicular], side, 'A transverse reaction');
      close(r.reactionLb.C[perpendicular], -side, 'C transverse reaction');
    }
  }
});

test('noncollinear but numerically near-mechanism V refuses an unreliable solve in either orientation', () => {
  // Positive rise: this is not exactly a geometric mechanism. Its two
  // free-axis stiffnesses have ratio (rise/halfSpan)^2 = 10^-14, and the
  // closed-form linear movement would already dwarf the source dimensions.
  // A nominal-looking result is worse than a numerical-stability rejection.
  for (const transpose of [false, true]) {
    assert.throws(() => analyzePinJointedTruss(fixture(1e-5, transpose)), /unstable|singular/i);
  }
});
