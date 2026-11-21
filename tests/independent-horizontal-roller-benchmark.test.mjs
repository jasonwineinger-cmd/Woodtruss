import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePinJointedTruss } from '../dist/analysis/src/index.js';

const model = {
  nodes: [{ id: 'A', x: 0, y: 0 }, { id: 'B', x: 0, y: 90 }, { id: 'C', x: 120, y: 90 }],
  bars: ['AB', 'BC', 'AC'].map(id => ({ id, a: id[0], b: id[1], areaIn2: 2, elasticModulusPsi: 1e6 })),
  loads: [{ nodeId: 'B', fxLb: 150, fyLb: -600 }, { nodeId: 'C', fyLb: -300 }],
  supports: [{ nodeId: 'A', fixX: true, fixY: true }, { nodeId: 'C', fixX: true, fixY: false }],
};

function check(actual, expected, label, limit = 1e-8) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= limit,
    `${label}: expected ${expected}, received ${actual}`);
}

test('elevated horizontal roller matches hand statics and projected displacement', () => {
  const result = analyzePinJointedTruss(model);
  // C's roller resists X, NOT Y. Moments about A:
  // -90*Cx - 90*150 - 120*300 = 0. Thus Cx=-550, Ax=400, Ay=900.
  for (const [id, x, y] of [['A', 400, 900], ['C', -550, 0]]) {
    check(result.reactionLb[id].x, x, `${id} horizontal reaction`);
    check(result.reactionLb[id].y, y, `${id} vertical reaction`);
  }
  // At C: -0.6*AC - 300=0; -BC - 0.8*AC - 550=0.
  // At B: -AB - 600=0. The three member forces are all compressive.
  for (const [id, force] of Object.entries({ AB: -600, BC: -150, AC: -500 })) {
    check(result.axialForceLb[id], force, `${id} axial force`);
  }
  // AB shortens 0.027 in; BC shortens 0.009 in with Cx fixed;
  // AC shortens 0.0375 in from a vertical C motion with projection 0.6.
  const u = result.displacementIn;
  for (const [id, x, y] of [['A', 0, 0], ['B', 0.009, -0.027], ['C', 0, -0.0625]]) {
    check(u[id].x, x, `${id} horizontal motion`, 1e-10);
    check(u[id].y, y, `${id} vertical motion`, 1e-10);
  }
  check(result.residualForceLb, 0, 'force residual');
});

test('same restraint count is not stable when the horizontal roller loses its vertical moment arm', () => {
  // The triangle still has nonzero area, but the pin and x-only roller are
  // now on the same horizontal line. A rigid infinitesimal rotation about
  // A moves C vertically only, in its unrestrained direction, and strains no bars.
  const mechanism = { ...model, nodes: model.nodes.map(n => n.id === 'C' ? { ...n, y: 0 } : n) };
  assert.throws(() => analyzePinJointedTruss(mechanism), /singular|unstable/i);
});
