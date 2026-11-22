import test from 'node:test';
import assert from 'node:assert/strict';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';

const near = (actual, expected, name, tolerance = 1e-10) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${name}: expected ${expected}, got ${actual}`);

test('shear-flexible propped beam gives the force-method reaction and recovers the released end angle', () => {
  const L = 126;
  const q = -2.15;
  const section = { areaIn2: 4, secondMomentIn4: 36, elasticModulusPsi: 1450000 };
  const shear = { shearModulusPsi: 78000, effectiveShearAreaIn2: 2.1 };
  const EI = section.elasticModulusPsi * section.secondMomentIn4;
  const GAs = shear.shearModulusPsi * shear.effectiveShearAreaIn2;
  const result = solveElasticFrame({
    nodes: [{ id: 'A', xIn: 0, yIn: 0 }, { id: 'B', xIn: L, yIn: 0 }],
    members: [{ id: 'beam', startNodeId: 'A', endNodeId: 'B', ...section, shear,
      releaseStartRotation: false, releaseEndRotation: true }],
    supports: [{ nodeId: 'A', fixX: true, fixY: true, fixRotation: true },
      { nodeId: 'B', fixX: false, fixY: true, fixRotation: false }],
    loads: [],
    memberLoads: [{ memberId: 'beam', basis: 'member-length', qxLbPerIn: 0, qyLbPerIn: q }],
  });

  // Remove the prop and integrate curvature plus shear strain to the free
  // tip. Then apply a tip force R_B to restore zero vertical movement.
  const freeTip = q * (L ** 4 / (8 * EI) + L ** 2 / (2 * GAs));
  const flexibility = L ** 3 / (3 * EI) + L / GAs;
  const RB = -freeTip / flexibility;
  const RA = -q * L - RB;
  const MA = -q * L ** 2 / 2 - RB * L;
  // Section rotation integrates bending curvature, not shear strain.
  const theta = q * L ** 3 / (6 * EI) + RB * L ** 2 / (2 * EI);

  near(result.reactions.A.fyLb, RA, 'fixed vertical reaction', 1e-7);
  near(result.reactions.A.momentLbIn, MA, 'fixed couple', 1e-7);
  near(result.reactions.B.fyLb, RB, 'prop reaction', 1e-7);
  near(result.reactions.B.momentLbIn, 0, 'prop couple', 1e-7);
  assert.equal(result.displacements.B.uyIn, 0);
  assert.equal(result.displacements.B.rotationRad, null);
  const { localDisplacements, localEndActions } = result.memberEndActions.beam;
  for (const [i, expected] of [0, 0, 0, 0, 0, theta].entries()) {
    near(localDisplacements[i], expected, `member movement component ${i}`);
  }
  for (const [i, expected] of [0, RA, MA, 0, RB, 0].entries()) {
    near(localEndActions[i], expected, `member end action component ${i}`, 1e-7);
  }
  assert.ok(Math.abs(RB - 3 * (-q) * L / 8) > 1,
    'synthetic parameters give a distinctly shear-dependent prop reaction');
  assert.equal(result.equilibrium.passes, true);
});
