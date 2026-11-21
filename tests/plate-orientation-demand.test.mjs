import assert from 'node:assert/strict';
import test from 'node:test';
import {capturePlateForceEvidence} from '../dist/connections/src/plate-model-binding.js';
import {reviewPlateOrientationDemand} from '../dist/connections/src/plate-orientation-demand.js';
const fixture=()=>{
 const source={revision:'r1',model:{
  nodes:[{id:'A',x:0,y:0},{id:'B',x:100,y:100},{id:'C',x:200,y:0}],
  bars:[['AB','A','B'],['BC','B','C'],['AC','A','C']].map(([id,a,b])=>({id,a,b,areaIn2:2,elasticModulusPsi:1e6})),
  supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}],
 }};
 const cases=[{id:'gravity',loads:[{nodeId:'B',fyLb:-100}]},
  {id:'uplift',loads:[{nodeId:'B',fyLb:40}]},{id:'unloaded',loads:[{nodeId:'B',fyLb:0}]}];
 const forces=cases.map(item=>capturePlateForceEvidence(source,item));
 const reference={
  identity:{manufacturer:'Synthetic',productCode:'TEST',family:'integral-toothed',issuer:'Test',
   documentId:'TEST',revisedMonth:'2026-08',digestSha256:'a'.repeat(64),scope:'Example',
   locator:'Test section',documentUrl:'https://example.test/example.pdf'},
  basis:{use:'truss-member-joint',species:'Test',grade:'Test',moistureAtAssembly:'dry',serviceMoisture:'dry',
   areaBasis:'net',angleDatum:'plate-long-axis',angleSense:'counterclockwise',faces:'paired-opposite'},
 };
 const orientation={revision:'r1',jointId:'A',axisDatum:'plate-long-axis',axisVector:{x:0,y:-1},incidentMemberIds:['AB','AC']};
 return {
  expected:{source,cases,jointId:'A',reference,orientation},
  supplied:{reference:{target:{revision:'r1',jointId:'A',modelKey:forces[0].modelKey,scenarios:forces.map(force=>({id:force.scenarioId,loadKey:force.loadKey}))},
   metadata:structuredClone(reference)},forces:[...forces].reverse(),orientation:structuredClone(orientation)},
 };
};
test('keeps unsigned member angle fixed as signed coincident demand reverses and reaches zero',()=>{
 const {expected,supplied}=fixture();
 const result=reviewPlateOrientationDemand(expected,supplied);
 assert.equal(result.status,'SIGNED_ORIENTATION_DEMAND_REVIEW_ONLY');
 const [diagonal,chord]=result.rows;
 assert.deepEqual([diagonal.unsignedAxisAngleDeg,chord.unsignedAxisAngleDeg],[45,90]);
 assert.deepEqual(diagonal.cases.map(c=>c.scenarioId),['gravity','uplift','unloaded']);
 assert.deepEqual(diagonal.cases.map(c=>c.axialSign),['negative','positive','zero-no-sign']);
 const near=(n,x)=>assert.ok(Math.abs(n-x)<1e-9,`${n} is not ${x}`);
 // At left heel, symmetric down-load puts -50 lb into each diagonal component.
 for(const [i,w] of [[0,-50],[1,20]]){
  near(diagonal.cases[i].modelGlobalFxLb,w);
  near(diagonal.cases[i].modelGlobalFyLb,w);
  near(diagonal.cases[i].signedAxialLb,w*Math.SQRT2);
  near(chord.cases[i].modelGlobalFxLb,-w);
  assert.equal(chord.cases[i].modelGlobalFyLb,0);
 }
 assert.deepEqual(diagonal.cases[2],{scenarioId:'unloaded',signedAxialLb:0,axialSign:'zero-no-sign',
  modelGlobalFxLb:0,modelGlobalFyLb:0});
 for(const gate of ['grainOrToothDirectionVerified','platePlacementRecommended','capacityVerified',
  'engineeringApproved','fabricationAuthorized','machineReleaseAuthorized']) assert.equal(result[gate],false);
});
test('fails closed on a stale case, stale revision or unverified selected orientation',()=>{
 for(const mutate of [
  (_e,s)=>s.reference.target.scenarios[0].loadKey='stale',
  (e)=>e.cases[0].loads[0].fyLb=-120,
  (_e,s)=>s.forces[0].revision='r0',
  (_e,s)=>s.forces[0].axialForceLb.AB=1,
  (_e,s)=>s.orientation.incidentMemberIds=['AB','BC'],
  (_e,s)=>delete s.orientation,
 ]){
  const {expected,supplied}=fixture();
  mutate(expected,supplied);
  const result=reviewPlateOrientationDemand(expected,supplied);
  assert.equal(result.status,'HELD_UNVERIFIED');
  assert.deepEqual(result.rows,[]);
 }
});
