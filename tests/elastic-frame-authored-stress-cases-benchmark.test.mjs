import test from 'node:test';
import assert from 'node:assert/strict';
import { studyAuthoredElasticFrameStressCases } from '../dist/analysis/src/elastic-frame-authored-stress-cases.js';

const L = 90, b = 2, h = 4;
const A = b * h, S = b * h ** 2 / 6;
const frame = {
  nodes: [{ id: 'A', xIn: 0, yIn: 0 }, { id: 'B', xIn: L, yIn: 0 }],
  members: [{ id: 'beam', startNodeId: 'A', endNodeId: 'B', areaIn2: A,
    secondMomentIn4: b * h ** 3 / 12, elasticModulusPsi: 1450000 }],
  supports: [{ nodeId: 'A', fixX: true, fixY: true, fixRotation: true }],
};
const makeCase = (caseId, fxLb, fyLb) => ({ caseId, loads: [{ nodeId: 'B', fxLb, fyLb, momentLbIn: 0 }] });
const input = {
  modelId: 'synthetic-cantilever',
  modelRevision: 'R1',
  frame,
  cases: [makeCase('gravity', 0, -50), makeCase('uplift', 0, 40), makeCase('axial-only', 1600, 0),
    makeCase('gravity-tie', 0, -50)],
  members: [{ memberId: 'beam', rectangle: { actualWidthIn: b, actualDepthIn: h } }],
};
const near = (actual, expected, name) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-8,
    `${name}: expected ${expected}, got ${actual}`);

test('authored case envelope carries the real cut and sign for gravity, uplift, and independent axial loading', () => {
  const study = studyAuthoredElasticFrameStressCases(input);
  assert.equal(study.status, 'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(study.fabricationAuthorized, false);
  assert.deepEqual(study.caseResults.map(result => result.caseId), input.cases.map(row => row.caseId));
  const axial = study.caseResults[2].memberRectangularStressExtrema.beam.positiveDepth.max;
  near(axial.axialLb, 1600, 'independent case axial spike');
  near(axial.momentLbIn, 0, 'no bending in axial-only case');
  near(axial.normalStressPsi, 1600 / A, 'axial-only fiber stress');
  const envelope = study.memberEnvelope.beam;
  for (const [row, actualCase, fy, fiberSign] of [
    [envelope.positiveDepth.max, 'gravity', -50, -1],
    [envelope.positiveDepth.min, 'uplift', 40, -1],
    [envelope.negativeDepth.max, 'uplift', 40, 1],
    [envelope.negativeDepth.min, 'gravity', -50, 1],
  ]) {
    // On the right free body, the tip force is a constant shear and
    // the moment arm grows from zero at the tip to L at the fixed end.
    // No case applies bending and axial force simultaneously here.
    assert.equal(row.caseId, actualCase);
    const { caseId, ...cut } = row;
    const side = fiberSign === -1 ? 'positiveDepth' : 'negativeDepth';
    const extreme = fiberSign * fy > 0 ? 'max' : 'min';
    assert.deepEqual(cut, study.caseResults.find(item => item.caseId === caseId)
      .memberRectangularStressExtrema.beam[side][extreme]);
    near(row.stationIn, 0, 'governing fixed-end station');
    near(row.axialLb, 0, 'same-case axial force');
    near(row.shearLb, fy, 'same-case shear force');
    near(row.momentLbIn, fy * L, 'same-case moment');
    near(row.normalStressPsi, fiberSign * fy * L / S, 'same-case fiber stress');
  }
  assert.ok(envelope.positiveDepth.max.normalStressPsi < 1600 / A + 50 * L / S,
    'must not add the separate axial spike to gravity bending');
});

test('exact cross-case ties go to the first authored case, not the case name', () => {
  const reranked = { ...input, cases: [input.cases[3], ...input.cases.slice(0, 3)] };
  const { positiveDepth, negativeDepth } = studyAuthoredElasticFrameStressCases(reranked).memberEnvelope.beam;
  assert.equal(positiveDepth.max.caseId, 'gravity-tie');
  assert.equal(negativeDepth.min.caseId, 'gravity-tie');
  assert.equal(positiveDepth.min.caseId, 'uplift');
});

test('a governing point-load side stays bound to the authored case that actually has that jump',()=>{
  const result=studyAuthoredElasticFrameStressCases({...input,cases:[
    makeCase('smooth',8,0),
    {caseId:'separate-point',loads:[],
      memberLoads:[{memberId:'beam',basis:'member-length',qxLbPerIn:1,qyLbPerIn:0}],
      memberPointLoads:[{memberId:'beam',stationIn:20,fxLb:-85,fyLb:0}]},
  ]});
  const peak=result.memberEnvelope.beam.positiveDepth.max;
  assert.equal(peak.caseId,'separate-point');
  assert.equal(peak.stationIn,20);
  assert.equal(peak.side,'right');
  near(peak.normalStressPsi,70/A,'right-hand force carries only the remaining uniform load');
  near(peak.axialLb,70,'unmixed same-cut axial');
  near(peak.shearLb,0,'unmixed same-cut shear');
  near(peak.momentLbIn,0,'unmixed same-cut moment');
});
