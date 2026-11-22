import test from 'node:test';
import assert from 'node:assert/strict';
import { studyElasticFrameHorizontalRestraint } from '../dist/analysis/src/elastic-frame-horizontal-restraint-study.js';

function fixture() {
  return {
    modelId: 'synthetic-axial-member', modelRevision: 'R2', caseId: 'compression',
    sourceRef: 'Hand-authored exploratory action', bearingNodeId: 'B', originNodeId: 'A',
    frame: {
      nodes: [{ id: 'A', xIn: 0, yIn: 0 }, { id: 'B', xIn: 90, yIn: 0 }],
      members: [{ id: 'AB', startNodeId: 'A', endNodeId: 'B', areaIn2: 4,
        secondMomentIn4: 20, elasticModulusPsi: 1400000 }],
      supports: [{ nodeId: 'A', fixX: true, fixY: true, fixRotation: true },
        { nodeId: 'B', fixX: false, fixY: true, fixRotation: false }],
    },
    loads: [{ nodeId: 'B', fxLb: -500, fyLb: 0, momentLbIn: 0 }],
    restraint: { kind: 'spring', stiffnessLbPerIn: 25000 },
  };
}
const study = studyElasticFrameHorizontalRestraint;
function reject(mutator) {
  const input = fixture();
  mutator(input);
  assert.throws(() => study(input));
}
const near = (actual, expected, label) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-8,
    `${label}: expected ${expected}, got ${actual}`);

test('signed inward movement is opposed by a positive hypothetical restraint force', () => {
  const input = fixture();
  const f = 90 / (4 * 1400000);
  const u0 = -500 * f;
  for (const restraint of [{ kind: 'free' }, input.restraint, { kind: 'rigid' }]) {
    const result = study({ ...input, restraint });
    const displacement = restraint.kind === 'rigid' ? 0 :
      restraint.kind === 'spring' ? u0 / (1 + restraint.stiffnessLbPerIn * f) : u0;
    near(result.unrestrainedUxIn, u0, 'free signed movement');
    near(result.flexibilityInPerLb, f, 'independent axial flexibility');
    near(result.predictedUxIn, displacement, 'analytical restrained displacement');
    near(result.restrainedUxIn, displacement, 'resolved restrained displacement');
    near(result.restraintForceLb, (displacement - u0) / f, 'signed hypothetical restraint force');
    assert.equal(result.status, 'PRELIMINARY_NOT_ENGINEERED');
    assert.equal(result.fabricationAuthorized, false);
  }
});

test('rejects unavailable or unsupported bearing and malformed restraints', () => {
  [
    value => { value.bearingNodeId = 'absent'; },
    value => { value.originNodeId = 'absent'; },
    value => { value.frame.supports.pop(); },
    value => { value.frame.supports[1].fixX = true; },
    value => { value.frame.supports[1].fixRotation = true; },
    value => { value.frame.supports[1] = { nodeId: 'B', freeDx: 1, freeDy: 0, fixRotation: false }; },
    value => { value.restraint = { kind: 'free', stiffnessLbPerIn: 0 }; },
    value => { value.restraint = { kind: 'rigid', capacityLb: 200 }; },
    value => { value.restraint = { kind: 'pinned' }; },
    value => { delete value.restraint.stiffnessLbPerIn; },
    ...[0, -10, Infinity, NaN, '1000', Number.MIN_VALUE].map(stiffness => value => {
      value.restraint.stiffnessLbPerIn = stiffness;
    }),
  ].forEach(reject);
});

test('rejects unavailable metadata and caller-supplied engineering conclusions', () => {
  [
    value => { value.modelRevision = ''; },
    value => { value.sourceRef = ''; },
    value => { value.loads = []; },
    value => { value.fabricationAuthorized = true; },
    value => { value.jointApproved = true; },
    value => { value.stiffnessCalibrated = true; },
    value => { value.predictedUxIn = 0; },
  ].forEach(reject);
});
