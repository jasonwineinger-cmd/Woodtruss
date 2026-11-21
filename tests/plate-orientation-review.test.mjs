import assert from 'node:assert/strict';
import test from 'node:test';
import {capturePlateForceEvidence} from '../dist/connections/src/plate-model-binding.js';
import {reviewPlateOrientation} from '../dist/connections/src/plate-orientation-review.js';
const fixture=()=>{
 const source={revision:'r1',model:{
  nodes:[{id:'A',x:0,y:0},{id:'B',x:100,y:100},{id:'C',x:200,y:0}],
  bars:[['AB','A','B'],['BC','B','C'],['AC','A','C']].map(([id,a,b])=>({id,a,b,areaIn2:2,elasticModulusPsi:1e6})),
  supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}],
 }};
 const cases=[{id:'test',loads:[{nodeId:'B',fyLb:-100}]}];
 const [force]=cases.map(item=>capturePlateForceEvidence(source,item));
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
  supplied:{reference:{target:{revision:'r1',jointId:'A',modelKey:force.modelKey,scenarios:[{id:'test',loadKey:force.loadKey}]},
   metadata:structuredClone(reference)},forces:[force],orientation:structuredClone(orientation)},
 };
};
test('hand 45 and 90 degree axis angles do not imply plate placement or capacity',()=>{
 const {expected,supplied}=fixture();
 const result=reviewPlateOrientation(expected,supplied);
 assert.equal(result.status,'ORIENTATION_GEOMETRY_REVIEW_ONLY');
 assert.deepEqual(result.rows,[{memberId:'AB',unsignedAxisAngleDeg:45},{memberId:'AC',unsignedAxisAngleDeg:90}]);
 for(const gate of ['placementRecommended','capacityVerified','engineeringApproved','fabricationAuthorized','machineReleaseAuthorized'])
  assert.equal(result[gate],false);
});
test('holds missing, unmatched, stale orientation and incomplete or invented incident members',()=>{
 for(const [mutate,hold] of [
  [(_e,s)=>delete s.orientation,'MISSING_ORIENTATION'],
  [(e,s)=>e.orientation.axisVector=s.orientation.axisVector={x:0,y:0},'ORIENTATION_MISMATCH'],
  [(_e,s)=>s.orientation.revision='r0','ORIENTATION_MISMATCH'],
  [(_e,s)=>s.orientation.jointId='B','ORIENTATION_MISMATCH'],
  [(_e,s)=>s.orientation.axisVector.x=1,'ORIENTATION_MISMATCH'],
  [(_e,s)=>s.orientation.axisDatum='plate-short-axis','ORIENTATION_MISMATCH'],
  [(_e,s)=>s.orientation.incidentMemberIds=['AB','BC'],'ORIENTATION_MISMATCH'],
  [(e,s)=>e.orientation.incidentMemberIds=s.orientation.incidentMemberIds=['AB','BC'],'MEMBER_GEOMETRY_UNVERIFIED'],
  [(e,s)=>e.orientation.incidentMemberIds=s.orientation.incidentMemberIds=['AB'],'MEMBER_GEOMETRY_UNVERIFIED'],
  [(e)=>e.source.model.nodes[1].y=101,'JOINT_EVIDENCE_UNVERIFIED'],
 ]){
  const {expected,supplied}=fixture();
  mutate(expected,supplied);
  const result=reviewPlateOrientation(expected,supplied);
  assert.equal(result.hold,hold);
  assert.deepEqual(result.rows,[]);
 }
});

test('opposite parallel axes fold to zero and a diagonal remains 45 degrees',()=>{
 const {expected,supplied}=fixture();
 expected.orientation.axisVector={x:-5,y:0};
 supplied.orientation.axisVector={x:-5,y:0};
 const result=reviewPlateOrientation(expected,supplied);
 assert.deepEqual(result.rows,[{memberId:'AB',unsignedAxisAngleDeg:45},{memberId:'AC',unsignedAxisAngleDeg:0}]);
});
