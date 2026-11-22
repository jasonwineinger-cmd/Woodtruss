import assert from 'node:assert/strict';
import test from 'node:test';
import { studyAuthoredElasticFrameCombinationDisplacements as study }
  from '../dist/analysis/src/elastic-frame-authored-combination-displacements.js';

const frame = {
  nodes: [{ id: 'A', xIn: 24, yIn: 13 }, { id: 'B', xIn: 624, yIn: 13 }],
  members: [{ id: 'AB', startNodeId: 'A', endNodeId: 'B', areaIn2: 5.25, secondMomentIn4: 5.359375,
    elasticModulusPsi: 1e6, releaseStartRotation: false, releaseEndRotation: false }],
  supports: [{ nodeId: 'A', fixX: true, fixY: true, fixRotation: true }],
};
const sources = [
  { caseId: 'base', sourceRef: 'synthetic tip load', loads: [{ nodeId: 'B', fxLb: 21, fyLb: -40, momentLbIn: 0 }] },
  { caseId: 'reverse', sourceRef: 'synthetic reverse tip load', loads: [{ nodeId: 'B', fxLb: -9, fyLb: 30, momentLbIn: 0 }] },
];
const combinations = [
  { caseId: 'z-first', sourceRef: 'synthetic combination A', terms: [{ caseId: 'base', factor: 1 }] },
  { caseId: 'a-last', sourceRef: 'synthetic combination B', terms: [{ caseId: 'reverse', factor: 1 }] },
];
const member = { memberId: 'AB', startNodeId: 'A', endNodeId: 'B', stationsIn: [600, 17, 0] };
const input = { modelId: 'explicit-frame-fixture', modelRevision: 'r1', frame, sources, combinations,
  observedNodeIds: ['B','A'], memberStations: [member] };
const review = change => study({ ...input, ...change });

test('accepts exactly 600 inches with case, node and directed station order preserved without release', () => {
  const before = JSON.stringify(input);
  const result = review();
  assert.equal(result.modelId, input.modelId);
  assert.equal(result.modelRevision, input.modelRevision);
  assert.equal(result.status, 'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(result.fabricationAuthorized, false);
  assert.deepEqual(result.cases.map(row => row.caseId), ['z-first','a-last']);
  for (const row of result.cases) {
    assert.deepEqual(row.nodalDisplacements.map(node => node.nodeId), input.observedNodeIds);
    const [output] = row.memberDisplacements;
    assert.deepEqual([output.memberId, output.startNodeId, output.endNodeId], ['AB','A','B']);
    assert.deepEqual(output.samples.map(sample => sample.stationIn), member.stationsIn);
  }
  assert.equal(JSON.stringify(input), before);
});

test('holds wrong directed and out-of-member stations and invalid node selections', () => {
  for (const invalid of [
    { observedNodeIds: [] }, { observedNodeIds: ['A','A'] }, { observedNodeIds: ['foreign'] },
    { memberStations: [] }, { memberStations: [member,member] },
    { memberStations: [{...member, startNodeId: 'B',endNodeId: 'A'}] },
    { memberStations: [{...member, memberId:'foreign'}] },
    ...[[600.0001],[-0.0001],[17,17],[NaN],['17'],new Array(1)].map(stationsIn => ({
      memberStations:[{...member,stationsIn}],
    })),
    { memberStations: [{...member, uyIn:0}] },
  ]) assert.throws(() => review(invalid));
});

test('rejects overspan, nonfinite frame, a malformed unused source and cached or approval inputs', () => {
  for (const change of [{xIn:624.0001},{xIn:NaN},{yIn:Infinity}]) {
    assert.throws(() => review({frame:{...frame,nodes:[frame.nodes[0],{...frame.nodes[1],...change}]}}));
  }
  for (const invalid of [
    { modelRevision: '' }, { fabricationAuthorized:true }, { memberSectionDisplacements:{} }, { originNodeId:'A' },
    { frame:{...frame,displacements:{}} },
    { sources:[{...sources[0], displacements:{}},sources[1]] },
  ]) assert.throws(() => review(invalid));
  const unused = { caseId:'unused',sourceRef:'synthetic invalid member point',loads:[],
    memberPointLoads:[{memberId:'AB',stationIn:600,fxLb:2,fyLb:0}] };
  assert.throws(() => review({sources:[...sources,unused]}), /source unused .* strictly within its ordered member/iu);
});
