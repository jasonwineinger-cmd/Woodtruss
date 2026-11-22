import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePinJointedTruss } from '../dist/analysis/src/index.js';

// Jönköping University Applied Mechanics, Truss Analysis, Example 2:
// https://mechanics.ju.se/SolidMechanics/TrussAnalysis.html#example-2-a-larger-structure
// The publication gives normalized results. The test chooses its own inch/lb
// scales for an ideal planar linear-elastic axial-bar model, not a wood design.
const L = 120;
const P = 1000;
const areaIn2 = 2;
const elasticModulusPsi = 1e6;
const displacementUnit = P * L / (areaIn2 * elasticModulusPsi);

const model = {
  nodes: [
    { id: '1', x: 0, y: 0 },
    { id: '2', x: L, y: 0 },
    { id: '3', x: L, y: L },
    { id: '4', x: 0, y: L },
  ],
  bars: ['12', '23', '34', '14', '24'].map(id => ({
    id, a: id[0], b: id[1], areaIn2, elasticModulusPsi,
  })),
  supports: [
    { nodeId: '1', fixX: true, fixY: true },
    { nodeId: '2', fixY: true },
  ],
  loads: [
    { nodeId: '3', fxLb: 0.7 * P, fyLb: -0.3 * P },
    { nodeId: '4', fxLb: 0.6 * P, fyLb: 0.8 * P },
  ],
};

function near(actual, expected, tolerance, name) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${name}: expected ${expected}, got ${actual}`);
}

test('published JU Example 2 matches all ideal bar forces, displacements and reactions', () => {
  const result = analyzePinJointedTruss(model);
  const axialByMember = { 12: 1.3, 23: -0.3, 34: 0.7, 14: 2.1, 24: -1.3 * Math.SQRT2 };
  const diagonalTerm = 13 * Math.SQRT2 / 5;
  const displacementByNode = {
    1: [0, 0], 2: [1.3, 0], 3: [4.1 + diagonalTerm, -0.3], 4: [3.4 + diagonalTerm, 2.1],
  };
  // The worked example reports the roller reaction. Whole-truss force balance
  // determines the remaining pin reactions from the two applied nodal forces.
  const reactionBySupport = { 1: [-1.3, -2.1], 2: [0, 1.6] };
  for (const [id, coefficient] of Object.entries(axialByMember)) {
    near(result.axialForceLb[id], coefficient * P, 1e-7, `bar ${id} signed force`);
  }
  for (const [node, [x, y]] of Object.entries(displacementByNode)) {
    near(result.displacementIn[node].x, x * displacementUnit, 1e-11, `node ${node} x displacement`);
    near(result.displacementIn[node].y, y * displacementUnit, 1e-11, `node ${node} y displacement`);
  }
  for (const [node, [x, y]] of Object.entries(reactionBySupport)) {
    near(result.reactionLb[node].x, x * P, 1e-7, `support ${node} x reaction`);
    near(result.reactionLb[node].y, y * P, 1e-7, `support ${node} y reaction`);
  }
});

test('the published JU model without its vertical roller is a mechanism', () => {
  // A pin alone permits whole-truss rotation, regardless of bar stiffness.
  assert.throws(() => analyzePinJointedTruss({ ...model, supports: model.supports.slice(0, 1) }),
    /singular|unstable/i);
});
