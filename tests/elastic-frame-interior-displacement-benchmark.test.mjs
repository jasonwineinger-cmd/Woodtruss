import test from 'node:test';
import assert from 'node:assert/strict';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';

const L = 120;
const section = { areaIn2: 4, secondMomentIn4: 31, elasticModulusPsi: 1400000 };
const EI = section.secondMomentIn4 * section.elasticModulusPsi;
const fixed = { nodeId: 'A', fixX: true, fixY: true, fixRotation: true };
const input = {
  nodes: [{ id: 'A', xIn: 0, yIn: 0 }, { id: 'B', xIn: L, yIn: 0 }],
  members: [{ id: 'beam', startNodeId: 'A', endNodeId: 'B', ...section }],
  supports: [fixed],
  loads: [],
};
const udl = q => [{ memberId: 'beam', basis: 'member-length', qxLbPerIn: 0, qyLbPerIn: q }];
const near = (actual, expected, label) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-9,
    `${label}: expected ${expected}, got ${actual}`);

test('loaded pin-pin beam samples interior deflection and both actual released end slopes', () => {
  const q = -2.2;
  const stations = [0, 89, 31, 60, L];
  const result = solveElasticFrame({
    ...input,
    members: [{ ...input.members[0], releaseStartRotation: true, releaseEndRotation: true }],
    supports: [{ ...fixed, fixRotation: false },
      { nodeId: 'B', fixX: false, fixY: true, fixRotation: false }],
    memberLoads: udl(q),
    memberDisplacementStations: [{ memberId: 'beam', stationsIn: stations }],
  });
  assert.equal(result.displacements.A.rotationRad, null);
  assert.equal(result.displacements.B.rotationRad, null);
  const samples = result.memberSectionDisplacements.beam;
  assert.equal(samples.length, stations.length);
  for (const [i, x] of stations.entries()) {
    // Integrate EI*v'' = -q*x*(L-x)/2, imposing zero displacement at
    // both supports. With no shear flexibility, section rotation is v'.
    const v = q * x * (L ** 3 - 2 * L * x ** 2 + x ** 3) / (24 * EI);
    const rotation = q * (L ** 3 - 6 * L * x ** 2 + 4 * x ** 3) / (24 * EI);
    near(samples[i].stationIn, x, 'station');
    near(samples[i].axialIn, 0, 'zero axial movement');
    near(samples[i].transverseIn, v, `transverse displacement at ${x}`);
    near(samples[i].rotationRad, rotation, `actual section rotation at ${x}`);
  }
});

test('shear cantilever samples both sides of an interior point force plus uniform loading', () => {
  const a = 43, P = 105, q = -1.45;
  const shear = { shearModulusPsi: 85000, effectiveShearAreaIn2: 2.3 };
  const GAs = shear.shearModulusPsi * shear.effectiveShearAreaIn2;
  const stations = [0, 19, a, 80, L];
  const result = solveElasticFrame({
    ...input,
    members: [{ ...input.members[0], shear }],
    memberLoads: udl(q),
    memberPointLoads: [{ memberId: 'beam', stationIn: a, fxLb: 0, fyLb: P }],
    memberDisplacementStations: [{ memberId: 'beam', stationsIn: stations }],
  });
  const samples = result.memberSectionDisplacements.beam;
  assert.equal(samples.length, stations.length);
  for (const [i, x] of stations.entries()) {
    // Direct integration from fixed end: q contributes V=q(L-x)
    // and M=q(L-x)^2/2. Point force contributes V=P and M=P(a-x)
    // before the force; beyond it, the point-induced slope is constant.
    const k = Math.min(x, a);
    const v = (q * (L ** 2 * x ** 2 / 4 - L * x ** 3 / 6 + x ** 4 / 24)
      + P * (a * (x * k - k ** 2 / 2) - x * k ** 2 / 2 + k ** 3 / 3)) / EI
      + (q * (L * x - x ** 2 / 2) + P * k) / GAs;
    const rotation = (q * (L ** 2 * x / 2 - L * x ** 2 / 2 + x ** 3 / 6)
      + P * (a * k - k ** 2 / 2)) / EI;
    near(samples[i].stationIn, x, 'station');
    near(samples[i].axialIn, 0, 'zero axial movement');
    near(samples[i].transverseIn, v, `transverse displacement at ${x}`);
    near(samples[i].rotationRad, rotation, `actual section rotation at ${x}`);
  }
  near(result.displacements.B.uyIn, samples.at(-1).transverseIn, 'recovered translation closes at free end');
  near(result.displacements.B.rotationRad, samples.at(-1).rotationRad, 'recovered rotation closes at free end');
});

test('invalid member displacement stations fail closed', () => {
  for (const stationsIn of [[-0.01], [L + 0.01], [NaN], [], [12, 12]]) {
    assert.throws(() => solveElasticFrame({
      ...input, memberLoads: udl(-1),
      memberDisplacementStations: [{ memberId: 'beam', stationsIn }],
    }), /station|sample/i);
  }
});

test('explicit station rows bind to one exact member without inspecting unrelated results', () => {
  const frame = { ...input, memberLoads: udl(-1) };
  const row = { memberId: 'beam', stationsIn: [36] };
  assert.deepEqual(solveElasticFrame(frame).memberSectionDisplacements, {});
  for (const bad of [
    undefined, [], [row, row], [{ ...row, memberId: 'B' }],
    [{ ...row, memberId: 'constructor' }], [{ ...row, field: 'extra' }],
    [{ ...row, stationsIn: [,36] }], [{ ...row, stationsIn: Array.from({length:65}, (_, i) => i) }],
  ]) {
    assert.throws(() => solveElasticFrame({ ...frame, memberDisplacementStations: bad }), /station/i);
  }
  assert.deepEqual(Object.keys(solveElasticFrame({ ...frame, memberDisplacementStations: [row] })
    .memberSectionDisplacements), ['beam']);
});

test('released shear beam includes transverse shear without replacing the private end rotations', () => {
  const q = -2.2;
  const shear = { shearModulusPsi: 85000, effectiveShearAreaIn2: 2.3 };
  const GAs = shear.shearModulusPsi * shear.effectiveShearAreaIn2;
  const stations = [0, L / 4, L / 2, L];
  const frame = solveElasticFrame({
    ...input,
    members: [{ ...input.members[0], shear, releaseStartRotation: true, releaseEndRotation: true }],
    supports: [{ ...fixed, fixRotation: false }, { nodeId: 'B', fixX: false, fixY: true, fixRotation: false }],
    memberLoads: udl(q),
    memberDisplacementStations: [{ memberId: 'beam', stationsIn: stations }],
  });
  assert.equal(frame.displacements.A.rotationRad, null);
  assert.equal(frame.displacements.B.rotationRad, null);
  for (const { stationIn: x, transverseIn, rotationRad } of frame.memberSectionDisplacements.beam) {
    const flexure = q * x * (L ** 3 - 2 * L * x ** 2 + x ** 3) / (24 * EI);
    // Signed shear V=q(L/2−x) integrates to zero at the far support.
    const shearDeflection = q * x * (L - x) / (2 * GAs);
    near(transverseIn, flexure + shearDeflection, 'flexure and shear displacement');
    near(rotationRad, q * (L ** 3 - 6 * L * x ** 2 + 4 * x ** 3) / (24 * EI), 'physical section rotation');
  }
  assert.equal(frame.fabricationAuthorized, false);
});
