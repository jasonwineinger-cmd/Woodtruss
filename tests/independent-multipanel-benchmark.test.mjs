import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePinJointedTruss } from '../dist/analysis/src/index.js';

function close(actual, expected, label, tolerance = 1e-7) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`);
}

test('two-panel determinate truss matches independent method of joints, including its zero-force chord', () => {
  // Five joints and seven bars; the three triangular cells share edges.
  // A is pinned, C is a vertical roller. Loads act only at D and E.
  const model = {
    nodes: [
      { id: 'A', x: 0, y: 0 }, { id: 'B', x: 90, y: 0 }, { id: 'C', x: 210, y: 0 },
      { id: 'D', x: 90, y: 120 }, { id: 'E', x: 210, y: 120 },
    ],
    bars: ['AB', 'BC', 'AD', 'BD', 'DE', 'BE', 'CE'].map(id => ({
      id, a: id[0], b: id[1], areaIn2: 2, elasticModulusPsi: 1e6,
    })),
    loads: [{ nodeId: 'D', fyLb: -600 }, { nodeId: 'E', fxLb: 180, fyLb: -300 }],
    supports: [{ nodeId: 'A', fixX: true, fixY: true }, { nodeId: 'C', fixX: false, fixY: true }],
  };
  const out = analyzePinJointedTruss(model);

  // About A: 210*Cy = 90*600 + 210*300 + 120*180; sum Fx/Fy closes the pin.
  for (const [id, x, y] of [['A', -180, 240], ['C', 0, 660]]) {
    close(out.reactionLb[id].x, x, `${id} reaction x`);
    close(out.reactionLb[id].y, y, `${id} reaction y`);
  }
  // At C the vertical reaction produces CE=-660 and has no horizontal partner except BC=0.
  // E gives BE/sqrt(2)=360 and DE=180-360=-180. At D, AD*(3/5)=DE and
  // -AD*(4/5)-BD-600=0. At A, AB=180-AD*(3/5). Positive = tension.
  for (const [id, force] of Object.entries({
    AB: 360, BC: 0, AD: -300, BD: -360, DE: -180, BE: 360 * Math.SQRT2, CE: -660,
  })) {
    close(out.axialForceLb[id], force, `${id} member force`);
  }

  // Hooke displacements derived from all seven member projections. AB extends
  // 0.0162, BC is unstrained, CE shortens 0.0396, DE shortens 0.0108 and BD
  // shortens 0.0216 in. AD: 0.6*uD+0.8*vD=-0.0225. BE elongates 0.0432,
  // so uE-uB+vE-vB=0.0432*sqrt(2). Eliminating gives uD-vD=0.0882+0.0432*sqrt(2).
  const differenceD = 0.0882 + 0.0432 * Math.SQRT2;
  const yD = (-0.0225 - 0.6 * differenceD) / 1.4;
  const xD = yD + differenceD;
  for (const [id, [x, y]] of Object.entries({
    A: [0, 0], B: [0.0162, yD + 0.0216], C: [0.0162, 0],
    D: [xD, yD], E: [xD - 0.0108, -0.0396],
  })) {
    close(out.displacementIn[id].x, x, `${id} displacement x`, 1e-10);
    close(out.displacementIn[id].y, y, `${id} displacement y`, 1e-10);
  }
  close(out.residualForceLb, 0, 'force residual');
});
