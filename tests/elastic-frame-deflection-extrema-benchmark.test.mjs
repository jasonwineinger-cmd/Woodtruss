import test from 'node:test';
import assert from 'node:assert/strict';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';

const L = 120;
const section = { areaIn2: 4, secondMomentIn4: 31, elasticModulusPsi: 1400000 };
const EI = section.secondMomentIn4 * section.elasticModulusPsi;
const fixed = { nodeId: 'A', fixX: true, fixY: true, fixRotation: true };
const model = {
  nodes: [{ id: 'A', xIn: 0, yIn: 0 }, { id: 'B', xIn: L, yIn: 0 }],
  members: [{ id: 'beam', startNodeId: 'A', endNodeId: 'B', ...section }],
  supports: [fixed],
  loads: [],
  memberDeflectionExtrema: [{ memberId: 'beam' }],
};
const near = (actual, expected, label, tolerance = 1e-8) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, got ${actual}`);
function check(extreme, x, v, label) {
  near(extreme.stationIn, x, `${label} station`);
  near(extreme.valueIn, v, `${label} displacement`);
}

test('tip-loaded cantilever has different absolute and displaced-chord extrema', () => {
  const P = -115;
  const result = solveElasticFrame({
    ...model, loads: [{ nodeId: 'B', fxLb: 0, fyLb: P, momentLbIn: 0 }],
  }).memberDeflectionExtrema.beam;
  // v(x)=P*x²*(3L-x)/(6EI). Chord slope is v(L)/L, so the
  // relative stationary point solves v'(x)=v(L)/L.
  const v = x => P * x ** 2 * (3 * L - x) / (6 * EI);
  const x = L * (1 - 1 / Math.sqrt(3));
  check(result.transverseIn.min, L, v(L), 'absolute minimum');
  check(result.transverseIn.max, 0, 0, 'absolute maximum');
  check(result.chordRelativeTransverseIn.max, x, v(x) - v(L) * x / L, 'chord-relative maximum');
  near(result.chordRelativeTransverseIn.min.valueIn, 0, 'chord-relative minimum');
});

test('analytic uniform-load midspan peak is shared when bearing displacements are zero', () => {
  const q = -1.9;
  const result = solveElasticFrame({
    ...model,
    members: [{ ...model.members[0], releaseStartRotation: true, releaseEndRotation: true }],
    supports: [{ ...fixed, fixRotation: false }, { nodeId: 'B', fixX: false, fixY: true, fixRotation: false }],
    memberLoads: [{ memberId: 'beam', basis: 'member-length', qxLbPerIn: 0, qyLbPerIn: q }],
  }).memberDeflectionExtrema.beam;
  const v = 5 * q * L ** 4 / (384 * EI);
  check(result.transverseIn.min, L / 2, v, 'absolute minimum');
  check(result.chordRelativeTransverseIn.min, L / 2, v, 'chord-relative minimum');
  near(result.transverseIn.max.valueIn, 0, 'absolute maximum');
  near(result.chordRelativeTransverseIn.max.valueIn, 0, 'chord-relative maximum');
});

test('chord-relative shear-flexible deflection can reach an extremum at a point-load cusp', () => {
  const P = -100, a = 36;
  const shear = { shearModulusPsi: 20000, effectiveShearAreaIn2: 2 };
  const GAs = shear.shearModulusPsi * shear.effectiveShearAreaIn2;
  const result = solveElasticFrame({
    ...model, members: [{ ...model.members[0], shear }],
    memberPointLoads: [{ memberId: 'beam', stationIn: a, fxLb: 0, fyLb: P }],
  }).memberDeflectionExtrema.beam;
  // Shear contributes to translation up to a only. In this case the
  // left chord-relative derivative starts negative and decreases to
  // the load; beyond a the derivative is constant and positive.
  const atLoad = P * a ** 3 / (3 * EI) + P * a / GAs;
  const atTip = P * a ** 2 * (3 * L - a) / (6 * EI) + P * a / GAs;
  const rotation = P * a ** 2 / (2 * EI);
  assert.ok(P / GAs < atTip / L && atTip / L < rotation);
  check(result.transverseIn.min, L, atTip, 'absolute minimum');
  check(result.chordRelativeTransverseIn.min, a, atLoad - atTip * a / L, 'cusp minimum');
});

test('reversing member order complements the signed chord extremum station and value',()=>{
  const loads=[{nodeId:'B',fxLb:0,fyLb:-115,momentLbIn:0}];
  const forward=solveElasticFrame({...model,loads}).memberDeflectionExtrema.beam;
  const reversed=solveElasticFrame({...model,loads,
    members:[{...model.members[0],startNodeId:'B',endNodeId:'A'}]}).memberDeflectionExtrema.beam;
  check(reversed.transverseIn.max,0,-forward.transverseIn.min.valueIn,'reversed absolute max');
  check(reversed.chordRelativeTransverseIn.min,L-forward.chordRelativeTransverseIn.max.stationIn,
    -forward.chordRelativeTransverseIn.max.valueIn,'reversed chord min');
});

test('extrema are opt-in, exact-member only, and reject embedded serviceability limits',()=>{
  const loads=[{nodeId:'B',fxLb:0,fyLb:-115,momentLbIn:0}];
  const {memberDeflectionExtrema: requests,...baseline}=model;
  assert.deepEqual(solveElasticFrame({...baseline,loads}).memberDeflectionExtrema,{});
  for (const invalid of [undefined,[],[...requests,...requests],[{memberId:'B'}],
    [{memberId:'beam',limitIn:1}],[,requests[0]]]) {
    assert.throws(()=>solveElasticFrame({...model,loads,memberDeflectionExtrema:invalid}),/extrema request/i);
  }
});
