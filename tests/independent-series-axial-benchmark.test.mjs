import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePinJointedTruss } from '../dist/analysis/src/index.js';

const model = {
  nodes: [
    { id: 'A', x: -25, y: 17 }, { id: 'B', x: 35, y: 17 },
    { id: 'C', x: 120, y: 17 }, { id: 'D', x: 245, y: 17 },
  ],
  bars: [
    { id: 'AB', a: 'A', b: 'B', areaIn2: 2, elasticModulusPsi: 1e6 },
    { id: 'BC', a: 'B', b: 'C', areaIn2: 4, elasticModulusPsi: 1e6 },
    { id: 'CD', a: 'C', b: 'D', areaIn2: 1, elasticModulusPsi: 1e6 },
  ],
  loads: [{ nodeId: 'B', fxLb: 800 }, { nodeId: 'C', fxLb: -1100 }, { nodeId: 'D', fxLb: 500 }],
  supports: ['A', 'B', 'C', 'D'].map(nodeId => ({ nodeId, fixX: nodeId === 'A', fixY: true })),
};

function near(actual, expected, label, tolerance = 1e-9) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`);
}

test('nonuniform serial chords with intermediate loads match section cuts and relative elongations', () => {
  const result = analyzePinJointedTruss(model);
  // Free bodies to the right of each section give +200, -600 and +500 lb.
  // The force sign reverses twice; applying the end load to all bars is wrong.
  near(result.reactionLb.A.x, -200, 'fixed end reaction');
  for (const id of ['A', 'B', 'C', 'D']) near(result.reactionLb[id].y, 0, `${id} vertical reaction`);
  for (const [id, force] of Object.entries({ AB: 200, BC: -600, CD: 500 })) {
    near(result.axialForceLb[id], force, `${id} signed force`);
  }
  // Individual FL/EA: +0.006, -0.01275 and +0.0625 in.
  const { A, B, C, D } = result.displacementIn;
  near(B.x - A.x, 0.006, 'AB extension');
  near(C.x - B.x, -0.01275, 'BC shortening');
  near(D.x - C.x, 0.0625, 'CD extension');
  near(D.x, 0.05575, 'end against fixed datum');
  for (const id of ['A', 'B', 'C', 'D']) near(result.displacementIn[id].y, 0, `${id} vertical restraint`);
  near(result.residualForceLb, 0, 'force residual');
});

test('axial load alignment does not hide a locally unrestrained transverse mechanism', () => {
  // Releasing C in y leaves only collinear adjacent bars: the x-only loading
  // does not excite the mechanism, but no valid 2D displacement solution exists.
  const unstable = { ...model, supports: model.supports.filter(s => s.nodeId !== 'C') };
  assert.throws(() => analyzePinJointedTruss(unstable), /singular|unstable/i);
});
