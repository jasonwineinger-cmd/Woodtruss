import assert from 'node:assert/strict';
import test from 'node:test';
import {solveElasticFrame} from '../dist/analysis/src/elastic-frame-solve.js';

test('an accepted ideal frame release does not admit rotational stiffness or rated plate moment',()=>{
 const member={id:'AB',startNodeId:'A',endNodeId:'B',areaIn2:2,secondMomentIn4:12,
  elasticModulusPsi:1e6,releaseStartRotation:true,releaseEndRotation:true};
 const frame={
  nodes:[{id:'A',xIn:0,yIn:0},{id:'B',xIn:120,yIn:0}],
  members:[member],
  supports:[{nodeId:'A',fixX:true,fixY:true,fixRotation:false},
   {nodeId:'B',fixX:false,fixY:true,fixRotation:false}],
  loads:[],
  memberPointLoads:[{memberId:'AB',stationIn:40,fxLb:0,fyLb:-90}],
 };
 const result=solveElasticFrame(frame);
 assert.equal(result.equilibrium.passes,true);
 assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(result.fabricationAuthorized,false);
 // These reactions establish a real solve, not capacity or recovered end actions.
 assert.ok(Math.abs(result.reactions.A.fyLb-60)<1e-8);
 assert.ok(Math.abs(result.reactions.B.fyLb-30)<1e-8);
 for(const extra of [{plateRotationalStiffnessLbInPerRad:123},{ratedPlateMomentLbIn:456}]){
  assert.throws(()=>solveElasticFrame({...frame,members:[{...member,...extra}]}),
   /Invalid or repeated frame member or end release fields/u);
 }
});
