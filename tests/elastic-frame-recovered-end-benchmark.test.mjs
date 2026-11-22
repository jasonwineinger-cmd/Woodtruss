import test from 'node:test';
import assert from 'node:assert/strict';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';

const L = 156;
const section = { areaIn2: 4, secondMomentIn4: 33, elasticModulusPsi: 1700000 };
const EI = section.elasticModulusPsi * section.secondMomentIn4;
const EA = section.elasticModulusPsi * section.areaIn2;
const fixed = { nodeId: 'A', fixX: true, fixY: true, fixRotation: true };
const prop = { nodeId: 'B', fixX: false, fixY: true, fixRotation: false };
const base = {
  nodes: [{ id: 'A', xIn: 0, yIn: 0 }, { id: 'B', xIn: L, yIn: 0 }],
  members: [{ id: 'AB', startNodeId: 'A', endNodeId: 'B', ...section }],
  loads: [],
};
function expectVector(actual, expected, name, tolerance) {
  assert.equal(actual.length, expected.length, `${name} vector width`);
  for (const [i, value] of expected.entries()) {
    assert.ok(Number.isFinite(actual[i]) && Math.abs(actual[i] - value) <= tolerance,
      `${name}[${i}]: expected ${value}, got ${actual[i]}`);
  }
}

test('single-member propped cantilever recovers nonzero internal hinge rotation and zero hinge action', () => {
  const w = 2.75;
  const result = solveElasticFrame({
    ...base,
    supports: [fixed, prop],
    members: [{ ...base.members[0], releaseStartRotation: false, releaseEndRotation: true }],
    memberLoads: [{ memberId: 'AB', basis: 'member-length', qxLbPerIn: 0, qyLbPerIn: -w }],
  });
  // Equating positive prop flexibility R_B*L³/(3EI) to the magnitude
  // of free tip drop w*L⁴/(8EI) gives R_B=3wL/8. The remainder is
  // R_A, and base equilibrium gives M_A=wL²/8. Integration of
  // EI*y''=-M_A+R_A*x-w*x²/2 to B gives theta_B=+wL³/(48EI).
  assert.equal(result.displacements.B.rotationRad, null);
  const member = result.memberEndActions.AB;
  expectVector(member.localDisplacements, [0, 0, 0, 0, 0, w * L ** 3 / (48 * EI)], 'member movement', 1e-10);
  expectVector(member.localEndActions, [0, 5 * w * L / 8, w * L ** 2 / 8, 0, 3 * w * L / 8, 0],
    'member node-on-element end actions', 1e-7);
  assert.equal(result.equilibrium.passes, true);
});

test('rigid-ended cantilever point load recovers free-end movement but no free-end action', () => {
  const a = 47, fx = -95, fy = 225;
  const result = solveElasticFrame({
    ...base, supports: [fixed],
    memberPointLoads: [{ memberId: 'AB', stationIn: a, fxLb: fx, fyLb: fy }],
  });
  const member = result.memberEndActions.AB;
  // The action lies inside the element, not at either end. Section
  // equilibrium plus integration on [0,a] gives the free nodal movement.
  // These endpoint actions do not describe the interior jump at station a.
  expectVector(member.localDisplacements,
    [0, 0, 0, fx * a / EA, fy * a ** 2 * (3 * L - a) / (6 * EI), fy * a ** 2 / (2 * EI)],
    'member movement', 1e-10);
  expectVector(member.localEndActions, [-fx, -fy, -a * fy, 0, 0, 0],
    'member node-on-element end actions', 1e-7);
  assert.equal(result.equilibrium.passes, true);
});
