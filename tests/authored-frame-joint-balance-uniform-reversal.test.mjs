import test from 'node:test';
import assert from 'node:assert/strict';
import {studyAuthoredElasticFrameCombinationJointBalance as study}
  from '../dist/analysis/src/elastic-frame-authored-combination-joint-balance.js';

const components=['fxLb','fyLb','momentLbIn'];
const xyz=(v,a)=>components.forEach((name,i)=>assert.ok(Number.isFinite(v[name])&&Math.abs(v[name]-a[i])<1e-7,
 `${name} ${v[name]} != ${a[i]}`));

test('physical uniform member action appears once and ideal support vectors survive independent direction reversals',()=>{
 for(const reverseMember of [false,true]) for(const reverseTangent of [false,true]){
  const [startNodeId,endNodeId]=reverseMember?['B','A']:['A','B'];
  const d=reverseTangent?-1:1;
  const result=study({
   modelId:'independent-uniform-frame',modelRevision:'r1',
   frame:{
    nodes:[{id:'A',xIn:0,yIn:0},{id:'B',xIn:120,yIn:0}],
    members:[{id:'beam',startNodeId,endNodeId,areaIn2:8,secondMomentIn4:12,elasticModulusPsi:1.2e6}],
    supports:[{nodeId:'A',fixX:true,fixY:true,fixRotation:false},{nodeId:'B',freeDx:3*d,freeDy:4*d,fixRotation:false}],
   },
   sources:[{caseId:'uniform',sourceRef:'synthetic constant force per member inch',loads:[],
    memberLoads:[{memberId:'beam',basis:'member-length',qxLbPerIn:2,qyLbPerIn:-5}]}],
   combinations:[{caseId:'check',sourceRef:'authored 1x factor',terms:[{caseId:'uniform',factor:1}]}],
   caseJoints:[{caseId:'check',nodeIds:['A','B']}],
  });
  assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(result.fabricationAuthorized,false);
  const [a,b]=result.cases[0].joints;
  // R_By*120 = 600*60, normal at B is parallel to (-4,3), and forces close.
  xyz(a.support,[160,300,0]); xyz(b.support,[-400,300,0]);
  xyz(a.applied,[0,0,0]); xyz(b.applied,[0,0,0]);
  for(const [node,at,vec] of [[a,reverseMember?'end':'start',[-160,-300,0]],
                              [b,reverseMember?'start':'end',[400,-300,0]]]){
   assert.equal(node.incident.length,1);
   assert.equal(node.incident[0].memberId,'beam'); assert.equal(node.incident[0].at,at);
   xyz(node.incident[0],vec); xyz(node.residual,[0,0,0]);
  }
 }
});
