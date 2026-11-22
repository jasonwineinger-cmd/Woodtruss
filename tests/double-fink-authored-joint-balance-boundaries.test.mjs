import assert from 'node:assert/strict';
import test from 'node:test';
import { generateDoubleFinkTopology } from '../dist/geometry/src/double-fink-topology.js';
import { studyAuthoredDoubleFinkElasticFrameJointBalance as study }
  from '../dist/analysis/src/double-fink-authored-elastic-frame-joint-balance.js';

const roof = { family: 'common', spanFt: 50, pitchRisePer12: 4 };
const memberAssignments = generateDoubleFinkTopology(roof).members.map(({ id, start, end }) => ({
  memberId: id, startNodeId: start, endNodeId: end, areaIn2: 5, secondMomentIn4: 14,
  elasticModulusPsi: 1e6, releaseStartRotation: false, releaseEndRotation: false,
}));
const supports = [
  { nodeId: 'L', fixX: true, fixY: true, fixRotation: false },
  { nodeId: 'E', fixX: false, fixY: true, fixRotation: false },
];
const member = { memberId: 'bottom-L-B1', startNodeId: 'L', endNodeId: 'B1' };
const point = { memberId: member.memberId, stationIn: 24, fxLb: 0, fyLb: -25 };
const sources = [
  { caseId: 'nodal', sourceRef: 'synthetic nodal fixture',
    loads: [{ nodeId: 'T4', fxLb: 0, fyLb: -90, momentLbIn: 0 }] },
  { caseId: 'point', sourceRef: 'synthetic interior point fixture', loads: [], memberPointLoads: [point] },
];
const combinations = [
  { caseId: 'point-active', sourceRef: 'synthetic combination A',
    terms: [{ caseId: 'nodal', factor: 1 }, { caseId: 'point', factor: 1 }] },
  { caseId: 'point-absent', sourceRef: 'synthetic combination B', terms: [{ caseId: 'nodal', factor: 1 }] },
];
const caseJoints = [
  { caseId: 'point-active', nodeIds: ['E', 'T4', 'L'] },
  { caseId: 'point-absent', nodeIds: ['B1', 'T4'] },
];
const request = { roof, memberAssignments, supports, modelId: 'double-fink-fixture', modelRevision: 'r1',
  sources, combinations, caseJoints };
const review = change => study({ ...request, ...change });

test('selects exact joints from each fresh authored case in authored order at 50 ft', () => {
  const result = review();
  assert.equal(result.status, 'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(result.fabricationAuthorized, false);
  assert.deepEqual(result.cases.map(item => item.caseId), caseJoints.map(item => item.caseId));
  assert.deepEqual(result.cases.map(item => item.joints.map(joint => joint.nodeId)),
    caseJoints.map(item => item.nodeIds));
  for (const joints of [
    caseJoints.slice(1), [...caseJoints].reverse(), [caseJoints[0], caseJoints[0]],
    [caseJoints[0], { ...caseJoints[1], caseId: 'foreign' }],
  ]) assert.throws(() => review({ caseJoints: joints }));
});

test('rejects extra evidence and ambiguous, stale or malformed joint selections', () => {
  for (const nodeIds of [
    [], ['T4','T4'], ['HL'], [' L'], [{ nodeId: 'L', fxLb: 15 }],
  ]) assert.throws(() => review({ caseJoints: [caseJoints[0], { ...caseJoints[1], nodeIds }] }));
  assert.throws(() => review({ caseJoints: [caseJoints[0], { ...caseJoints[1], joints: [] }] }));
  for (const invalid of [
    { roof: { ...roof, spanFt: 50.001 } }, { roof: { ...roof, spanFt: 7.999 } },
    { roof: { ...roof, heelHeightIn: 1 } }, { jointBalance: {} },
    { memberEndActions: {} }, { originNodeId: 'L' }, { fabricationAuthorized: true },
  ]) assert.throws(() => review(invalid));
});

test('holds bad unused target evidence and refuses a zero-weight source bypass', () => {
  assert.throws(() => review({ sources: null }), /explicit source cases/iu);
  const unused = { caseId: 'unused', sourceRef: 'synthetic invalid foreign joint',
    loads: [{ nodeId: 'HL', fxLb: 0, fyLb: -1, momentLbIn: 0 }] };
  assert.throws(() => review({ sources: [...sources, unused] }), /unknown|not modeled|not present/iu);
  assert.throws(() => review({
    sources: [...sources, unused],
    combinations: [combinations[0], { ...combinations[1],
      terms: [...combinations[1].terms, { caseId: unused.caseId, factor: 0 }] }],
  }));
});
