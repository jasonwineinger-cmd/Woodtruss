import assert from 'node:assert/strict';
import test from 'node:test';
import { generateRaisedHeelCommonTopology } from '../dist/geometry/src/raised-heel-common-topology.js';
import { studyAuthoredRaisedHeelCommonElasticFrameJointBalance as study }
  from '../dist/analysis/src/raised-heel-common-authored-elastic-frame-joint-balance.js';

const roof = { family: 'common', spanFt: 50, pitchRisePer12: 4, heelHeightIn: 48 };
const memberAssignments = generateRaisedHeelCommonTopology(roof).members.map(({ id, start, end }) => ({
  memberId: id, startNodeId: start, endNodeId: end, areaIn2: 5, secondMomentIn4: 14,
  elasticModulusPsi: 1e6, releaseStartRotation: false, releaseEndRotation: false,
}));
const supports = [
  { nodeId: 'L', fixX: true, fixY: true, fixRotation: false },
  { nodeId: 'E', fixX: false, fixY: true, fixRotation: false },
];
const sources = [
  { caseId: 'heel', sourceRef: 'synthetic left top heel load', loads: [{ nodeId: 'HL', fxLb: 30, fyLb: -90, momentLbIn: 0 }] },
  { caseId: 'peak', sourceRef: 'synthetic peak load', loads: [{ nodeId: 'R', fxLb: 0, fyLb: -70, momentLbIn: 0 }] },
];
const combinations = sources.map(({caseId}) => ({
  caseId: `case-${caseId}`, sourceRef: 'synthetic combination', terms: [{ caseId, factor: 1 }],
}));
const caseJoints = [
  { caseId: 'case-heel', nodeIds: ['HE', 'E', 'HL', 'L'] },
  { caseId: 'case-peak', nodeIds: ['R', 'HE'] },
];
const request = { roof, memberAssignments, supports, modelId: 'raised-heel-fixture', modelRevision: 'r1',
  sources, combinations, caseJoints };
const review = change => study({ ...request, ...change });

test('preserves ordered top heel and actual bearing endpoints at the 50-foot limit', () => {
  const result = review();
  assert.equal(result.status, 'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(result.fabricationAuthorized, false);
  assert.deepEqual(result.cases.map(({ caseId, joints }) => ({ caseId, nodeIds: joints.map(row => row.nodeId) })), caseJoints);
  const [rightHeel, rightBearing, leftHeel, leftBearing] = result.cases[0].joints;
  const end = (joint, memberId) => joint.incident.find(row => row.memberId === memberId)?.at;
  assert.deepEqual([
    end(leftBearing, 'web-L-HL'), end(leftHeel, 'web-L-HL'),
    end(rightHeel, 'web-HE-E'), end(rightBearing, 'web-HE-E'),
  ], ['start','end','start','end']);
  const zero = { fxLb: 0, fyLb: 0, momentLbIn: 0 };
  assert.deepEqual(leftHeel.support, zero);
  assert.deepEqual(rightHeel.support, zero);
  assert.deepEqual(leftHeel.applied, { fxLb: 30, fyLb: -90, momentLbIn: 0 });
  assert.deepEqual(leftBearing.applied, zero);
  assert.notDeepEqual(leftBearing.support, zero);
});

test('holds ordinary and oversized roof, substituted heel supports, and wrong authored selection', () => {
  const { heelHeightIn, ...withoutHeel } = roof;
  assert.equal(heelHeightIn, 48);
  for (const change of [
    { roof: withoutHeel }, { roof: {...roof, heelHeightIn: 0} }, { roof: {...roof, spanFt: 50.001} },
    { supports: [{ ...supports[0], nodeId: 'HL' }, supports[1]] },
    { supports: [supports[0], { ...supports[1], nodeId: 'HE' }] },
    { caseJoints: [...caseJoints].reverse() }, { caseJoints: caseJoints.slice(0,1) },
    { caseJoints: [caseJoints[0], {...caseJoints[1], nodeIds: ['R','HR']}] },
    { caseJoints: [caseJoints[0], {...caseJoints[1], nodeIds: ['R','R']}] },
  ]) assert.throws(() => review(change));
});

test('rejects cached/capacity input and unused invalid targets from an ordinary-family source', () => {
  for (const change of [
    { jointBalance: {} }, { memberEndActions: {} }, { allowableMomentLbIn: 100 },
    { fabricationAuthorized: true }, { originNodeId: 'L' }, { modelRevision: '' },
    { caseJoints: [caseJoints[0], {...caseJoints[1], joints: []}] },
  ]) assert.throws(() => review(change));
  const unused = { caseId: 'unused', sourceRef: 'synthetic foreign ordinary-roof point load', loads: [],
    memberPointLoads: [{memberId:'top-L-Q1', stationIn: 12, fxLb: 1, fyLb: 0}] };
  assert.throws(() => review({ sources: [...sources, unused] }), /exact member of the shared frame/iu);
});
