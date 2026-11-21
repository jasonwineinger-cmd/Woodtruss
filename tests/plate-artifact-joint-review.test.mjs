import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import { capturePlateForceEvidence } from '../dist/connections/src/plate-model-binding.js';
import {reviewSourceLinkedPlateJoint} from '../dist/connections/src/plate-artifact-joint-review.js';
const bytes=Buffer.from('Synthetic local reference document');
const authorization={purpose:'authorized-local-reference-review',sha256:createHash('sha256').update(bytes).digest('hex')};

const reference={
 identity:{manufacturer:'Synthetic-Writer',productCode:'Private-SKU',family:'integral-toothed',issuer:'Report Desk',
 documentId:'Private-entry',revisedMonth:'2026-08',digestSha256:authorization.sha256,scope:'Synthetic base',
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
 return {localArtifactBytes:Buffer.from(bytes),reference:{metadata:structuredClone(reference),target:{revision:source.revision,jointId:'B',
  modelKey:forces[0].modelKey,scenarios:[...forces].reverse().map(f=>({id:f.scenarioId,loadKey:f.loadKey}))}},forces};
};

test('ties the authorized local artifact to the same exact documented joint and signed scenarios without approving scope',async()=>{
 const result=await reviewSourceLinkedPlateJoint(expected,authorization,supplied());
 assert.deepEqual(result,{
  status:'SOURCE_LINKED_APPLICABILITY_REVIEW_ONLY',hold:null,localArtifactMatched:true,
  documentedJointCasesMatched:true,scenarioCount:2,incidentMemberCount:2,
  manufacturerSourceAuthenticated:false,manufacturerScopeApproved:false,applicabilityVerified:false,
  capacityVerified:false,engineeringApproved:false,fabricationAuthorized:false,machineReleaseAuthorized:false,
 });
 const serialized=JSON.stringify(result);
 for(const raw of [authorization.sha256,'Private-SKU','source-17','load-up','example.test','-1000'])
  assert.equal(serialized.includes(raw),false);
});
test('holds exact bytes with the wrong use or revision, stale signed cases, and substituted or missing local source',async()=>{
 for(const [mutate,expectedHold] of [
  [s=>s.reference.metadata.identity.revisedMonth='2025-05','REFERENCE_OR_BOUND_JOINT_UNVERIFIED'],
  [s=>s.reference.metadata.identity.productCode='OTHER','REFERENCE_OR_BOUND_JOINT_UNVERIFIED'],
  [s=>s.reference.metadata.basis.faces='single','REFERENCE_OR_BOUND_JOINT_UNVERIFIED'],
  [s=>s.reference.metadata.basis.serviceMoisture='wet','REFERENCE_OR_BOUND_JOINT_UNVERIFIED'],
  [s=>s.reference.target.scenarios[0].loadKey='stale','REFERENCE_OR_BOUND_JOINT_UNVERIFIED'],
  [s=>s.forces[0].axialForceLb.AB=1,'REFERENCE_OR_BOUND_JOINT_UNVERIFIED'],
  [s=>s.localArtifactBytes[0]=0,'AUTHORIZED_LOCAL_ARTIFACT_UNVERIFIED'],
  [s=>delete s.localArtifactBytes,'AUTHORIZED_LOCAL_ARTIFACT_UNVERIFIED'],
 ]){
  const input=supplied();mutate(input);
  const result=await reviewSourceLinkedPlateJoint(expected,authorization,input);
  assert.equal(result.status,'HELD_UNVERIFIED');
  assert.equal(result.hold,expectedHold);
  assert.equal(result.scenarioCount,0);
  assert.equal(result.fabricationAuthorized,false);
 }
 assert.equal((await reviewSourceLinkedPlateJoint(expected,null,supplied())).hold,'AUTHORIZED_LOCAL_ARTIFACT_UNVERIFIED');
});
