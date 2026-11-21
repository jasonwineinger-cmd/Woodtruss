import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePinJointedTruss } from '../dist/analysis/src/index.js';

const model = {
  nodes: [
    { id: 'A', x: 0, y: 0 }, { id: 'B', x: 90, y: 60 },
    { id: 'C', x: 90, y: 120 }, { id: 'E', x: 180, y: 0 },
  ],
  bars: ['AB', 'BE', 'AC', 'CE', 'BC'].map(id => ({
    id, a: id[0], b: id[1], areaIn2: 2, elasticModulusPsi: 1e6,
  })),
  loads: [{ nodeId: 'B', fxLb: 150 }, { nodeId: 'C', fyLb: -800 }],
  supports: [{ nodeId: 'A', fixX: true, fixY: true }, { nodeId: 'E', fixX: false, fixY: true }],
};

function near(actual, expected, label, tolerance = 1e-8) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, got ${actual}`);
}

test('raised-chord two-triangle model matches hand statics and virtual work at the lower apex', () => {
  const out = analyzePinJointedTruss(model);
  // 180*Ey = 90*800 + 60*150. The lateral load at the raised
  // chord creates a moment that an equivalent support-height load would not.
  near(out.reactionLb.A.x, -150, 'left horizontal reaction');
  near(out.reactionLb.A.y, 350, 'left vertical reaction');
  near(out.reactionLb.E.x, 0, 'horizontal roller freedom');
  near(out.reactionLb.E.y, 450, 'right vertical reaction');

  const s = Math.sqrt(13);
  // At C the two upper chord forces N match by horizontal equilibrium.
  // At E, BE=-(sqrt(13)/5)*N from x equilibrium, so Ey+(2/5)*N=0.
  // Joint A then gives AB, and C's vertical equilibrium gives BC.
  const forces = { AB: 275*s, BE: 225*s, AC: -1125, CE: -1125, BC: 1000 };
  for (const [id, force] of Object.entries(forces)) near(out.axialForceLb[id], force, `${id} force`);

  // An independently solved +1 lb vertical virtual load at B gives
  // both support y reactions -1/2, upper forces +5/4, lower forces
  // -sqrt(13)/4 and tie -2. Apply sum(N*n*L/EA) for B's upward motion.
  const virtual = {
    AB: [-s/4, 30*s], BE: [-s/4, 30*s], AC: [5/4, 150], CE: [5/4, 150], BC: [-2, 60],
  };
  const expectedB = Object.entries(virtual)
    .reduce((sum, [id, [n, length]]) => sum + forces[id]*n*length/2e6, 0);
  near(out.displacementIn.B.y, expectedB, 'lower apex movement', 1e-10);
  near(out.residualForceLb, 0, 'force residual');
});

test('closed raised-chord outline without the vertical tie is still a mechanism', () => {
  // The outline alone is a pin-jointed four-bar loop; no bracing/continuity
  // can be inferred merely because its members enclose a profile.
  const unsafe = { ...model, bars: model.bars.filter(bar => bar.id !== 'BC') };
  assert.throws(() => analyzePinJointedTruss(unsafe), /unstable|singular/i);
});
