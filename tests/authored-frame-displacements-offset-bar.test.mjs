import test from 'node:test';
import assert from 'node:assert/strict';
import {studyAuthoredElasticFrameCombinationDisplacements as study}
  from '../dist/analysis/src/elastic-frame-authored-combination-displacements.js';

const near=(value,expected)=>assert.ok(Number.isFinite(value)&&Math.abs(value-expected)<1e-9,`${value} != ${expected}`);

test('an elevated roller and reversed released bar keep global nodes separate from local motion',()=>{
 for(const reversed of [false,true]){
  const [startNodeId,endNodeId]=reversed?['B','A']:['A','B'];
  const stationsIn=[150,0,75];
  const result=study({
   modelId:'elevated-released-bar',modelRevision:'r1',
   frame:{
    nodes:[{id:'A',xIn:0,yIn:0},{id:'B',xIn:120,yIn:90}],
    members:[{id:'AB',startNodeId,endNodeId,areaIn2:1,secondMomentIn4:2,elasticModulusPsi:1.2e6,
     releaseStartRotation:true,releaseEndRotation:true}],
    supports:[{nodeId:'A',fixX:true,fixY:true,fixRotation:false},{nodeId:'B',freeDx:1,freeDy:0,fixRotation:false}],
   },
   sources:[{caseId:'tip',sourceRef:'synthetic end force',loads:[{nodeId:'B',fxLb:300,fyLb:-100,momentLbIn:0}]}],
   combinations:[{caseId:'show',sourceRef:'exact factor',terms:[{caseId:'tip',factor:1}]}],
   observedNodeIds:['B','A'], memberStations:[{memberId:'AB',startNodeId,endNodeId,stationsIn}],
  });
  assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(result.fabricationAuthorized,false);
  const [row]=result.cases, [b,a]=row.nodalDisplacements;
  // With the roller's Y restrained, B's 300 lb horizontal force gives
  // N=300/.8=375 lb, extension N L/EA=.046875 in and ux=extension/.8.
  near(b.uxIn,.05859375); near(b.uyIn,0); near(a.uxIn,0); near(a.uyIn,0);
  assert.equal(b.nodeId,'B'); assert.equal(a.nodeId,'A');
  assert.equal(b.rotationRad,null); assert.equal(a.rotationRad,null);
  const [bar]=row.memberDisplacements;
  assert.deepEqual([bar.startNodeId,bar.endNodeId],[startNodeId,endNodeId]);
  assert.deepEqual(bar.samples.map(sample=>sample.stationIn),stationsIn);
  for(const sample of bar.samples){
   const physicalFraction=reversed?1-sample.stationIn/150:sample.stationIn/150;
   const orientation=reversed?-1:1;
   near(sample.axialIn,orientation*.046875*physicalFraction);
   near(sample.transverseIn,orientation*(-.03515625)*physicalFraction);
   // Both axes reverse, so the small CCW rotation of the unloaded bar is
   // the same for either directed station frame, not a nodal rotation DOF.
   near(sample.rotationRad,-.03515625/150);
  }
 }
});
