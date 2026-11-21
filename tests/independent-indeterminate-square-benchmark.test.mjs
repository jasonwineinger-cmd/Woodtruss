import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePinJointedTruss } from '../dist/analysis/src/index.js';

const model = {
  nodes: [
    { id: 'A', x: 0, y: 0 }, { id: 'B', x: 100, y: 0 },
    { id: 'C', x: 100, y: 100 }, { id: 'D', x: 0, y: 100 },
  ],
  // AC and BD cross but are independent bars, with no crossing joint.
  bars: ['AB', 'BC', 'CD', 'AD', 'AC', 'BD'].map(id => ({
    id, a: id[0], b: id[1], areaIn2: 1, elasticModulusPsi: 1e6,
  })),
  loads: ['C', 'D'].map(nodeId => ({ nodeId, fyLb: -1000 })),
  supports: ['A', 'B'].map(nodeId => ({ nodeId, fixX: true, fixY: true })),
};

function near(actual, expected, name, tolerance = 1e-7) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${name}: expected ${expected}, got ${actual}`);
}

test('two uncoupled crossing diagonals match elastic compatibility in an indeterminate square', () => {
  const result = analyzePinJointedTruss(model);
  // Reflection symmetry gives C=(u,-w), D=(-u,-w). Horizontal and vertical
  // sides have stiffness k=10,000 lb/in; the diagonals have k/sqrt(2).
  // At C, top-chord tension is 2ku and diagonal force is k(u-w)/2.
  // Fx=0 gives w=(1+4sqrt(2))u. Fy=0 then gives 1000=k(w+2u).
  // This uses compatibility to resolve redundancy, not statics alone.
  const k = 10000;
  const u = 0.1 / (3 + 4 * Math.SQRT2);
  const w = 0.1 - 2 * u;
  for (const [node, x, y] of [['A', 0, 0], ['B', 0, 0], ['C', u, -w], ['D', -u, -w]]) {
    near(result.displacementIn[node].x, x, `${node} displacement x`, 1e-11);
    near(result.displacementIn[node].y, y, `${node} displacement y`, 1e-11);
  }
  for (const [id, force] of Object.entries({
    AB: 0, BC: -k*w, CD: 2*k*u, AD: -k*w, AC: -2*k*u*Math.SQRT2, BD: -2*k*u*Math.SQRT2,
  })) {
    near(result.axialForceLb[id], force, `${id} signed force`);
  }
  near(result.reactionLb.A.x, 2*k*u, 'pin A x');
  near(result.reactionLb.B.x, -2*k*u, 'pin B x');
  near(result.reactionLb.A.y, 1000, 'pin A y');
  near(result.reactionLb.B.y, 1000, 'pin B y');
  near(result.residualForceLb, 0, 'force residual');
});

test('pin-jointed square without either diagonal is a sway mechanism', () => {
  // Moving C and D horizontally together does not strain the retained bars
  // to first order. Symmetric vertical loads do not make this model stable.
  const mechanism = { ...model, bars: model.bars.filter(bar => bar.id !== 'AC' && bar.id !== 'BD') };
  assert.throws(() => analyzePinJointedTruss(mechanism), /singular|unstable/i);
});
