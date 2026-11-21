import assert from 'node:assert/strict';
import test from 'node:test';
import { capturePlateForceEvidence } from '../dist/connections/src/plate-model-binding.js';
import { reviewDocumentedPlateJoint } from '../dist/connections/src/plate-joined-review.js';

const reference={
 identity:{manufacturer:'Synthetic-Writer',productCode:'Private-SKU',family:'integral-toothed',issuer:'Report Desk',
 documentId:'Private-entry',revisedMonth:'2026-08',digestSha256:'a'.repeat(64),scope:'Synthetic base',
 locator:'Private page',documentUrl:'https://example.test/plate.pdf'},
 basis:{use:'truss-member-joint',species:'Test wood',grade:'Test grade',moistureAtAssembly:'dry',
 serviceMoisture:'dry',areaBasis:'net',angleDatum:'plate-long-axis',angleSense:'counterclockwise',faces:'paired-opposite'},
};
const source={revision:'source-17',model:{
 nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:120},{id:'C',x:240,y:0}],
 bars:[['AB','A','B'],['BC','B','C'],['AC','A','C']].map(([id,a,b])=>({id,a,b,areaIn2:2,elasticModulusPsi:1e6})),
 supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}],
}};
const cases=[{id:'load-down',loads:[{nodeId:'B',fyLb:-1000}]},{id:'load-up',loads:[{nodeId:'B',fyLb:400}]}];
const expected={reference,source,cases,jointId:'B'};
const supplied=()=>{
 const forces=cases.map(s=>capturePlateForceEvidence(source,s));
 return {reference:{metadata:structuredClone(reference),target:{revision:source.revision,jointId:'B',
  modelKey:forces[0].modelKey,scenarios:[...forces].reverse().map(f=>({id:f.scenarioId,loadKey:f.loadKey}))}},forces};
};

test('joins one exact joint, matching reference edition and solved cases without exposing evidence payloads',()=>{
 const result=reviewDocumentedPlateJoint(expected,supplied());
 assert.deepEqual(result,{
  status:'DOCUMENTED_REVIEW_ONLY',hold:null,scenarioCount:2,incidentMemberCount:2,
  manufacturerSourceAuthenticated:false,capacityVerified:false,engineeringApproved:false,
  fabricationAuthorized:false,machineReleaseAuthorized:false,
 });
 const serialized=JSON.stringify(result);
 for(const val of ['source-17','Private-SKU','example.test','load-down','aaaaaa','-1000','modelKey','axialForceLb'])
  assert.equal(serialized.includes(val),false);
});

test('holds missing, mismatched or malformed reference context without exposing errors',()=>{
 assert.equal(reviewDocumentedPlateJoint(expected,{}).hold,'MISSING_EVIDENCE');
 for(const [mutate,hold] of [
  [s=>s.reference.target.revision='source-16','REFERENCE_TARGET_MISMATCH'],
  [s=>s.reference.target.jointId='A','REFERENCE_TARGET_MISMATCH'],
  [s=>s.reference.target.scenarios[0].id='load-down','REFERENCE_TARGET_MISMATCH'],
  [s=>s.reference.target.scenarios[0].loadKey='stale case','REFERENCE_TARGET_MISMATCH'],
  [s=>s.reference.target.modelKey='stale model','REFERENCE_TARGET_MISMATCH'],
  [s=>s.reference.metadata.identity.revisedMonth='2025-05','REFERENCE_METADATA_MISMATCH'],
  [s=>s.reference.metadata.basis.faces='single','REFERENCE_METADATA_MISMATCH'],
  [s=>s.reference.metadata.capacityLb=42,'INVALID_REFERENCE_METADATA'],
  [s=>s.forces[0].axialForceLb.AB=0,'BOUND_FORCE_EVIDENCE_UNVERIFIED'],
  [s=>s.forces[0].revision='source-16','BOUND_FORCE_EVIDENCE_UNVERIFIED'],
  [s=>[s.forces[0].loadKey,s.forces[1].loadKey]=[s.forces[1].loadKey,s.forces[0].loadKey],
   'BOUND_FORCE_EVIDENCE_UNVERIFIED'],
 ]){
  const current=supplied();mutate(current);
  const result=reviewDocumentedPlateJoint(expected,current);
  assert.equal(result.status,'HELD_UNVERIFIED');
  assert.equal(result.hold,hold);
  assert.equal(result.scenarioCount,0);
  assert.equal(result.fabricationAuthorized,false);
 }
 const unknown=supplied();unknown.reference.target.jointId='missing';
 assert.equal(reviewDocumentedPlateJoint({...expected,jointId:'missing'},unknown).hold,'JOINT_NOT_IN_BOUND_MODEL');
});
