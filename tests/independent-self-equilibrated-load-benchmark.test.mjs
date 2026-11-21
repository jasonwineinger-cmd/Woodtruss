import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePinJointedTruss } from '../dist/analysis/src/index.js';

const model = {
  nodes: [
    { id: 'A', x: 0, y: 0 }, { id: 'B', x: 120, y: 0 }, { id: 'C', x: 240, y: 0 },
    { id: 'D', x: 60, y: 80 }, { id: 'E', x: 180, y: 80 },
  ],
  bars: ['AB', 'BC', 'AD', 'DB', 'DE', 'BE', 'EC'].map(id => ({
    id, a: id[0], b: id[1], areaIn2: 2, elasticModulusPsi: 1e6,
  })),
  loads: [{ nodeId: 'D', fxLb: 400 }, { nodeId: 'E', fxLb: -400 }],
  supports: [{ nodeId: 'A', fixX: true, fixY: true }, { nodeId: 'C', fixX: false, fixY: true }],
};

function near(actual, expected, label, tolerance = 1e-8) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, got ${actual}`);
}

test('zero vector resultant and zero moment still produce local force and motion', () => {
  const out = analyzePinJointedTruss(model);
  // The two opposite forces are collinear, so both their resultant and
  // moment vanish. Joint statics permit DE=-400 and all other bars zero:
  // DE alone balances D/E and these values close all five joints.
  for (const [id, reaction] of Object.entries(out.reactionLb)) {
    near(reaction.x, 0, `${id} reaction x`);
    near(reaction.y, 0, `${id} reaction y`);
  }
  for (const bar of model.bars) near(out.axialForceLb[bar.id], bar.id === 'DE' ? -400 : 0, `${bar.id} force`);

  // DE shortens 400(120)/EA = 0.024 in. No axial extension in the
  // four 3-4-5 slopes gives vD=-(3/4)uD, vE=(3/4)uE,
  // vB=-(3/2)uD=(3/2)uE. The two bottom bars fix both Bx and Cx.
  for (const [id, x, y] of [['A', 0, 0], ['B', 0, -0.018], ['C', 0, 0],
    ['D', 0.012, -0.009], ['E', -0.012, -0.009]]) {
    near(out.displacementIn[id].x, x, `${id} displacement x`, 1e-10);
    near(out.displacementIn[id].y, y, `${id} displacement y`, 1e-10);
  }
  near(out.residualForceLb, 0, 'force residual');
});

test('the balanced force pair cannot be solved after removing its compression path', () => {
  // The displacements above without their DE axial constraint form an
  // admissible infinitesimal mechanism, despite zero external resultant.
  const missingPath = { ...model, bars: model.bars.filter(bar => bar.id !== 'DE') };
  assert.throws(() => analyzePinJointedTruss(missingPath), /singular|unstable/i);
});
