import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePinJointedTruss } from '../dist/analysis/src/index.js';

function close(actual, expected, label, tolerance = 1e-8) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`);
}

test('unequal axial stiffness yields the hand-calculated coupled compliance and reciprocal work', () => {
  // The two 50-in bars have direction ratios 3/5 and 4/5 from the
  // fully fixed support points to the free joint; unequal areas create
  // horizontal/vertical coupling that does not exist for equal stiffness.
  const base = {
    nodes: [{ id: 'A', x: 0, y: 0 }, { id: 'B', x: 30, y: 40 }, { id: 'C', x: 60, y: 0 }],
    bars: [
      { id: 'AB', a: 'A', b: 'B', areaIn2: 1, elasticModulusPsi: 1e6 },
      { id: 'CB', a: 'C', b: 'B', areaIn2: 3, elasticModulusPsi: 1e6 },
    ],
    supports: ['A', 'C'].map(nodeId => ({ nodeId, fixX: true, fixY: true })),
  };
  const solve = (fxLb, fyLb) => analyzePinJointedTruss({ ...base, loads: [{ nodeId: 'B', fxLb, fyLb }] });
  const p = solve(300, 0), q = solve(0, 800), combined = solve(300, 800);

  // Equilibrium of the free joint independently gives P=[250,-250],
  // Q=[500,500] lb in [AB,CB]. Axial flexibilities L/(EA) are 1/20000
  // and 1/60000 in/lb, respectively. Positive means tension.
  for (const [result, ab, cb] of [[p, 250, -250], [q, 500, 500], [combined, 750, 250]]) {
    close(result.axialForceLb.AB, ab, 'AB force');
    close(result.axialForceLb.CB, cb, 'CB force');
  }

  // Virtual work computes each term from those independent force states:
  // P^T*d(P) = 25/6; Q^T*d(Q) = 50/3; P^T*d(Q) = Q^T*d(P) = 25/6 lb-in.
  // In particular the off-diagonal term is NONzero; two mutually agreeing
  // wrong zero cross-terms must not pass this reciprocity check.
  close(300 * p.displacementIn.B.x, 25 / 6, 'P self-work');
  close(800 * q.displacementIn.B.y, 50 / 3, 'Q self-work');
  close(300 * q.displacementIn.B.x, 25 / 6, 'P work through Q motion');
  close(800 * p.displacementIn.B.y, 25 / 6, 'Q work through P motion');

  const mixed = combined.displacementIn.B;
  close(mixed.x, 1 / 36, 'mixed displacement x', 1e-10);
  close(mixed.y, 5 / 192, 'mixed displacement y', 1e-10);
  // Linear elastic strain energy = (750²/20000 + 250²/60000)/2.
  close((300 * mixed.x + 800 * mixed.y) / 2, 175 / 12, 'mixed strain energy');
});
