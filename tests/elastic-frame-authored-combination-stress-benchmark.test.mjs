import test from 'node:test';
import assert from 'node:assert/strict';
import { studyAuthoredElasticFrameCombinationStress } from '../dist/analysis/src/elastic-frame-authored-combination-stress.js';

const L = 30, a = 10, b = 2, h = 4;
const A = b * h, S = b * h ** 2 / 6;
const frame = {
  nodes: [{ id: 'A', xIn: 0, yIn: 0 }, { id: 'B', xIn: L, yIn: 0 }],
  members: [{ id: 'beam', startNodeId: 'A', endNodeId: 'B', areaIn2: A,
    secondMomentIn4: b * h ** 3 / 12, elasticModulusPsi: 1470000 }],
  supports: [{ nodeId: 'A', fixX: true, fixY: true, fixRotation: true }],
};
const fromSource = (caseId, tipY, pointY) => ({
  caseId, sourceRef: `Synthetic-declared-input:${caseId}`,
  loads: [{ nodeId: 'B', fxLb: 0, fyLb: tipY, momentLbIn: 0 }],
  memberLoads: [{ memberId: 'beam', basis: 'member-length', qxLbPerIn: 1, qyLbPerIn: 0 }],
  memberPointLoads: [{ memberId: 'beam', stationIn: a, fxLb: -30, fyLb: pointY }],
});
const authorship = (caseId, gravity, uplift) => ({
  caseId, sourceRef: `Hand-authored:${caseId}`,
  terms: [{ caseId: 'input-down', factor: gravity }, { caseId: 'input-up', factor: uplift }],
});
const input = {
  modelId: 'synthetic-end-loaded-beam', modelRevision: 'r1',
  frame,
  sources: [fromSource('input-down', -12, -6), fromSource('input-up', 6, 3)],
  combinations: [authorship('weighted-down', 1.5, 0.5), authorship('weighted-up', 0.25, 2), authorship('transverse-cancels', 1, 2),
    authorship('signed-difference', 0.125, -0.25)],
  members: [{ memberId: 'beam', rectangle: { actualWidthIn: b, actualDepthIn: h } }],
};
function near(actual, expected, name) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-8,
    `${name}: expected ${expected}, got ${actual}`);
}

test('authored factors produce real down/up corner fibers and merge coincident point actions', () => {
  const study = studyAuthoredElasticFrameCombinationStress(input);
  assert.equal(study.status, 'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(study.fabricationAuthorized, false);
  assert.deepEqual(study.caseResults.map(row => row.caseId), input.combinations.map(row => row.caseId));
  for (const [i, combination] of input.combinations.entries()) {
    const actual = study.combinationProvenance[i];
    assert.equal(actual.caseId, combination.caseId);
    assert.equal(actual.sourceRef, combination.sourceRef);
    assert.deepEqual(actual.terms.map(({ caseId, sourceRef, factor }) => ({ caseId, sourceRef, factor })),
      combination.terms.map(term => ({ ...term, sourceRef: input.sources.find(row => row.caseId === term.caseId).sourceRef })));
  }
  const envelope = study.memberEnvelope.beam;
  for (const [row, caseId, vy, moment, sign] of [
    [envelope.positiveDepth.max, 'weighted-down', -22.5, -525, -1],
    [envelope.negativeDepth.min, 'weighted-down', -22.5, -525, 1],
    [envelope.positiveDepth.min, 'weighted-up', 13.5, 315, -1],
    [envelope.negativeDepth.max, 'weighted-up', 13.5, 315, 1],
  ]) {
    // Against the cut at A: −30 times the sum of the authored factors
    // cancels qx*30. The tip and point Y loads give distinct signed net
    // force and moments about A, with arms 30 and 10 respectively.
    assert.equal(row.caseId, caseId);
    near(row.stationIn, 0, 'fixed-end cut');
    near(row.axialLb, 0, 'same-cut axial');
    near(row.shearLb, vy, 'same-cut shear');
    near(row.momentLbIn, moment, 'same-cut bending');
    near(row.normalStressPsi, sign * moment / S, 'same-cut normal stress');
  }
  const cancellation = study.caseResults[2].memberRectangularStressExtrema.beam;
  for (const fiber of [cancellation.positiveDepth, cancellation.negativeDepth]) {
    // 1 down + 2 up cancels both Y components. qx sums to 3, with
    // a single −90 axial jump from the two point loads at x=10.
    for (const [row, side, axial] of [[fiber.min, 'left', -30], [fiber.max, 'right', 60]]) {
      assert.equal(row.side, side);
      near(row.stationIn, a, 'point station');
      near(row.axialLb, axial, 'merged axial jump');
      near(row.shearLb, 0, 'canceled Y force');
      near(row.momentLbIn, 0, 'canceled bending');
      near(row.normalStressPsi, axial / A, 'pure axial fiber stress');
    }
  }
});

test('the composed study refuses unauthored factors and wrong-frame actions even in an unused source', () => {
  assert.throws(() => studyAuthoredElasticFrameCombinationStress({
    ...input, combinations: [{ ...input.combinations[0], terms: [{ caseId: 'input-down' }] }],
  }), /factor|term|authored/i);
  assert.throws(() => studyAuthoredElasticFrameCombinationStress({
    ...input, sources: [...input.sources, {
      caseId: 'unused', sourceRef: 'Synthetic unused source',
      loads: [{ nodeId: 'unknown-node', fxLb: 0, fyLb: 1, momentLbIn: 0 }],
    }],
  }), /unknown|frame|node/i);
  assert.throws(() => studyAuthoredElasticFrameCombinationStress({
    ...input, capacityApproved: true,
  }), /exact|authored|field/i);
});
