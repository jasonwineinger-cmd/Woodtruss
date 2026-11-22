import test from 'node:test';
import assert from 'node:assert/strict';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';

const near = (actual, expected, label, tolerance = 1e-10) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`);

test('off-center inclined point action preserves fixed/free response under member reversal', () => {
  const L = 100, c = 0.6, s = 0.8, a = 27;
  const fx = 180, fy = -120;
  const areaIn2 = 5, secondMomentIn4 = 22, elasticModulusPsi = 1600000;
  const EA = elasticModulusPsi * areaIn2, EI = elasticModulusPsi * secondMomentIn4;
  const axial = c * fx + s * fy, transverse = -s * fx + c * fy;
  // Axial force is constant only from fixed end to the load. Curvature is
  // transverse*(a-x)/EI on [0,a] and zero on [a,L]. Integrating to the tip
  // includes the straight-line continuation with constant slope after a.
  const u = axial * a / EA;
  const v = transverse * a ** 2 * (3 * L - a) / (6 * EI);
  const angle = transverse * a ** 2 / (2 * EI);
  for (const [startNodeId, endNodeId, stationIn] of [['fixed', 'tip', a], ['tip', 'fixed', L - a]]) {
    const result = solveElasticFrame({
      nodes: [{ id: 'fixed', xIn: 0, yIn: 0 }, { id: 'tip', xIn: 60, yIn: 80 }],
      members: [{ id: 'incline', startNodeId, endNodeId, areaIn2, secondMomentIn4, elasticModulusPsi }],
      supports: [{ nodeId: 'fixed', fixX: true, fixY: true, fixRotation: true }],
      loads: [],
      memberPointLoads: [{ memberId: 'incline', stationIn, fxLb: fx, fyLb: fy }],
    });
    const label = `${startNodeId}→${endNodeId}`;
    near(result.displacements.tip.uxIn, c * u - s * v, `${label} tip x`);
    near(result.displacements.tip.uyIn, s * u + c * v, `${label} tip y`);
    near(result.displacements.tip.rotationRad, angle, `${label} tip rotation`);
    near(result.reactions.fixed.fxLb, -fx, `${label} fixed x`, 1e-8);
    near(result.reactions.fixed.fyLb, -fy, `${label} fixed y`, 1e-8);
    near(result.reactions.fixed.momentLbIn, -(c * a * fy - s * a * fx),
      `${label} fixed couple`, 1e-7);
    assert.equal(result.equilibrium.passes, true);
  }
});
