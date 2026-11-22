import assert from 'node:assert/strict';
import test from 'node:test';
import { generateDoubleFinkTopology } from '../dist/geometry/src/double-fink-topology.js';
import { studyAuthoredDoubleFinkElasticFrameSectionCuts as study }
  from '../dist/analysis/src/double-fink-authored-elastic-frame-section-cuts.js';

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
const row = (caseId, cuts) => ({ caseId, memberCuts: [{ ...member, cuts }] });
const caseCuts = [
  row('point-active', [{ stationIn: 24, side: 'left' }, { stationIn: 24, side: 'right' }]),
  row('point-absent', [{ stationIn: 24, side: 'continuous' }, { stationIn: 75, side: 'continuous' }]),
];
const request = { roof, memberAssignments, supports, modelId: 'double-fink-fixture', modelRevision: 'r1',
  sources, combinations, caseCuts };
const review = change => study({ ...request, ...change });
const overrideCut = (caseIndex, ...cuts) => caseCuts.map((item, i) => i === caseIndex ? row(item.caseId, cuts) : item);

test('requires the exact ordered case list and physical cut sides from each fresh solve', () => {
  const result = review();
  assert.equal(result.status, 'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(result.fabricationAuthorized, false);
  assert.deepEqual(result.cases.map(item => item.caseId), combinations.map(item => item.caseId));
  for (const resultCase of result.cases) {
    const [cutMember] = resultCase.memberCuts;
    assert.equal(cutMember.memberId, member.memberId);
    assert.ok(cutMember.cuts.every(cut => Number.isFinite(cut.momentLbIn)));
  }
  for (const invalid of [
    caseCuts.slice(1), [...caseCuts].reverse(), [caseCuts[0], caseCuts[0]],
    [caseCuts[0], { ...caseCuts[1], caseId: 'foreign' }],
    overrideCut(0, { stationIn: 24, side: 'continuous' }),
    overrideCut(1, { stationIn: 24, side: 'left' }),
    overrideCut(0, { stationIn: 24.000001, side: 'right' }),
    overrideCut(1, { stationIn: 75, side: 'left' }),
  ]) assert.throws(() => review({ caseCuts: invalid }));
});

test('rejects wrong-directed and out-of-span sections as well as cached, capacity or release fields', () => {
  const first = caseCuts[0].memberCuts[0];
  for (const invalid of [
    [{ ...caseCuts[0], memberCuts: [{ ...first, startNodeId: 'B1', endNodeId: 'L' }] }, caseCuts[1]],
    [{ ...caseCuts[0], memberCuts: [{ ...first, memberId: 'bottom-L-stale' }] }, caseCuts[1]],
    overrideCut(0, { stationIn: 75.001, side: 'continuous' }),
    overrideCut(0, { stationIn: -0.001, side: 'continuous' }),
    overrideCut(0, { stationIn: 24, side: 'left' }, { stationIn: 24, side: 'left' }),
    overrideCut(0, { stationIn: 24, side: 'right', shearLb: 25 }),
    overrideCut(0, { stationIn: 24, side: 'right', allowableMomentLbIn: 100 }),
  ]) assert.throws(() => review({ caseCuts: invalid }));
  for (const invalid of [
    { roof: { ...roof, spanFt: 50.001 } }, { roof: { ...roof, heelHeightIn: 1 } },
    { memberSectionDemand: {} }, { originNodeId: 'L' }, { fabricationAuthorized: true },
  ]) assert.throws(() => review(invalid));
});

test('holds invalid sources even when not used, and does not permit a zero-weight bypass', () => {
  for (const badSource of [
    { caseId: 'unused', sourceRef: 'synthetic foreign joint', loads: [{ nodeId: 'HL', fxLb: 0, fyLb: -1, momentLbIn: 0 }] },
    { caseId: 'unused', sourceRef: 'synthetic endpoint point load', loads: [], memberPointLoads: [{ ...point, stationIn: 75 }] },
  ]) {
    const allSources = [...sources, badSource];
    assert.throws(() => review({ sources: allSources }));
    assert.throws(() => review({
      sources: allSources,
      combinations: [combinations[0], { ...combinations[1], terms: [
        ...combinations[1].terms, { caseId: badSource.caseId, factor: 0 },
      ] }],
    }));
  }
  assert.throws(() => review({ combinations: [combinations[0], { ...combinations[1], terms: [
    ...combinations[1].terms, { caseId: 'point', factor: 0 },
  ] }] }));
});
