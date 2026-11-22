import test from 'node:test';
import assert from 'node:assert/strict';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';

const L = 114;
const section = { areaIn2: 4, secondMomentIn4: 23, elasticModulusPsi: 1500000 };
const shear = { shearModulusPsi: 95000, effectiveShearAreaIn2: 2.4 };
const EI = section.elasticModulusPsi * section.secondMomentIn4;
const GAs = shear.shearModulusPsi * shear.effectiveShearAreaIn2;
const model = {
  nodes: [{ id: 'A', xIn: 11, yIn: 0 }, { id: 'B', xIn: 11 + L, yIn: 0 }],
  members: [{ id: 'AB', startNodeId: 'A', endNodeId: 'B', ...section, shear }],
  supports: [{ nodeId: 'A', fixX: true, fixY: true, fixRotation: true }],
  loads: [],
};
const near = (actual, expected, label, tolerance = 1e-10) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`);

function check(result, tipY, theta, baseY, baseMoment) {
  near(result.displacements.B.uxIn, 0, 'tip x');
  near(result.displacements.B.uyIn, tipY, 'tip y');
  near(result.displacements.B.rotationRad, theta, 'tip section rotation');
  near(result.reactions.A.fyLb, baseY, 'base y', 1e-8);
  near(result.reactions.A.momentLbIn, baseMoment, 'base couple', 1e-7);
  for (const [i, expected] of [0, baseY, baseMoment, 0, 0, 0].entries()) {
    near(result.memberEndActions.AB.localEndActions[i], expected, `local end action ${i}`, 1e-7);
  }
  assert.equal(result.equilibrium.passes, true);
}

test('interior point action adds shear translation only where the cantilever carries shear', () => {
  const P = 135, a = 41;
  const result = solveElasticFrame({
    ...model,
    memberPointLoads: [{ memberId: 'AB', stationIn: a, fxLb: 0, fyLb: P }],
  });
  // V=P up to a and zero afterward; M=P*(a-x) up to a. Integrate
  // theta'=M/EI and v'=theta+V/GAs; past a, theta remains constant.
  check(result, P * a ** 2 * (3 * L - a) / (6 * EI) + P * a / GAs,
    P * a ** 2 / (2 * EI), -P, -P * a);
});

test('full-length downward uniform action matches independent shear and flexure integrals', () => {
  const q = -2.75;
  const result = solveElasticFrame({
    ...model,
    memberLoads: [{ memberId: 'AB', basis: 'member-length', qxLbPerIn: 0, qyLbPerIn: q }],
  });
  // V(x)=q*(L-x) and M(x)=q*(L-x)^2/2; neither causes a free-end
  // applied nodal action. Integrating v' and theta' gives signed tip values.
  check(result, q * L ** 4 / (8 * EI) + q * L ** 2 / (2 * GAs),
    q * L ** 3 / (6 * EI), -q * L, -q * L ** 2 / 2);
});
