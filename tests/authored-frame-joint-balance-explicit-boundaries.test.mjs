import assert from 'node:assert/strict';
import test from 'node:test';
import { studyAuthoredElasticFrameCombinationJointBalance as study }
  from '../dist/analysis/src/elastic-frame-authored-combination-joint-balance.js';

const frame = {
  nodes: [{ id: 'A', xIn: 24, yIn: 0 }, { id: 'B', xIn: 624, yIn: 0 }],
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
const caseJoints = [{ caseId: 'z-first', nodeIds: ['B','A'] }, { caseId: 'a-last', nodeIds: ['A','B'] }];
const input = { modelId: 'explicit-frame-fixture', modelRevision: 'r1', frame, sources, combinations, caseJoints };
const review = change => study({ ...input, ...change });

test('accepts a translated frame at exactly 600 inches and preserves ordered case and node selections', () => {
  const before = JSON.stringify(input);
  const result = review();
  assert.equal(result.modelId, input.modelId);
  assert.equal(result.modelRevision, input.modelRevision);
  assert.equal(result.status, 'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(result.fabricationAuthorized, false);
  assert.deepEqual(result.cases.map(({caseId,joints}) => ({caseId,nodeIds:joints.map(row=>row.nodeId)})),caseJoints);
  const [tip,bearing]=result.cases[0].joints;
  assert.equal(tip.incident[0].at,'end');
  assert.equal(bearing.incident[0].at,'start');
  assert.equal(JSON.stringify(input),before);
  for (const invalid of [
    [...caseJoints].reverse(), caseJoints.slice(0,1), [caseJoints[0],caseJoints[0]],
    [caseJoints[0],{...caseJoints[1],nodeIds:['A','A']}],
    [caseJoints[0],{...caseJoints[1],nodeIds:['C']}],
  ]) assert.throws(()=>review({caseJoints:invalid}));
});

test('holds overspan, malformed geometry or restraints, and injected cached or release fields', () => {
  const withNode = change => ({ ...frame, nodes: [frame.nodes[0],{...frame.nodes[1],...change}] });
  for (const invalid of [
    withNode({xIn:624.0001}), withNode({xIn:NaN}), withNode({yIn:Infinity}),
    {...frame,supports:[{...frame.supports[0],nodeId:'foreign'}]},
    {...frame,supports:[{...frame.supports[0],fixRotation:false}]},
    {...frame,memberEndActions:{}},
  ]) assert.throws(()=>review({frame:invalid}));
  for (const invalid of [
    {modelRevision:''}, {jointBalance:{}}, {memberSectionDemand:{}},
    {fabricationAuthorized:true}, {capacityVerified:true},
    {caseJoints:[caseJoints[0],{...caseJoints[1],joints:[]}]},
  ]) assert.throws(()=>review(invalid));
});

test('rejects an unknown target in a source even when no combination uses it', () => {
  const unused={caseId:'unused',sourceRef:'synthetic foreign source',
    loads:[{nodeId:'foreign',fxLb:1,fyLb:0,momentLbIn:0}]};
  assert.throws(()=>review({sources:[...sources,unused]}),/unknown|not modeled|not present|exact node/iu);
});
