import test from 'node:test';
import assert from 'node:assert/strict';
import { studyAuthoredElasticFrameCombinationDisplacements as displacements }
  from '../dist/analysis/src/elastic-frame-authored-combination-displacements.js';
import { studyAuthoredElasticFrameCombinationJointBalance as joints }
  from '../dist/analysis/src/elastic-frame-authored-combination-joint-balance.js';

const axialRigidity = 960_000;
const bars=[['AB','A','B',96],['AC','A','C',60],['BC','B','C',60]];
const frame = support => ({
  nodes:[{id:'A',xIn:0,yIn:0},{id:'B',xIn:96,yIn:0},{id:'C',xIn:48,yIn:36}],
  members:bars.map(([id,startNodeId,endNodeId])=>({id,startNodeId,endNodeId,areaIn2:8,
    secondMomentIn4:12,elasticModulusPsi:axialRigidity/8,releaseStartRotation:true,releaseEndRotation:true})),
  supports:[{nodeId:'A',fixX:true,fixY:true,fixRotation:false},{nodeId:'B',fixRotation:false,...support}],
});
const basis = support => ({
  modelId:'synthetic-all-pin-triangle',modelRevision:'r1',frame:frame(support),
  sources:[{caseId:'load',sourceRef:'synthetic joint load',loads:[{nodeId:'C',fxLb:60,fyLb:-120,momentLbIn:0}]}],
  combinations:[{caseId:'only',sourceRef:'explicit unit factor',terms:[{caseId:'load',factor:1}]}],
});
const run = support => displacements({...basis(support),observedNodeIds:['B','C','A'],
  memberStations:bars.map(([memberId,startNodeId,endNodeId,length])=>({memberId,startNodeId,endNodeId,
    stationsIn:[length,length/2,0]}))});
const reactions = support => joints({...basis(support),caseJoints:[{caseId:'only',nodeIds:['B','A']}]}).cases[0].joints;
const near = (actual,expected) => assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<1e-8,
  `${actual} != independent result ${expected}`);
function axialForce(row,length) {
  const [last,,first]=row.samples;
  return axialRigidity*(last.axialIn-first.axialIn)/length;
}

test('all-pin triangle matches hand statics and each directed bar extension on its authored stations',()=>{
  for(const sign of [1,-1]){
    const support={freeDx:4*sign,freeDy:-3*sign};
    const result=run(support);
    assert.equal(result.fabricationAuthorized,false);
    const {nodalDisplacements,memberDisplacements}=result.cases[0];
    assert.deepEqual(nodalDisplacements.map(row=>row.nodeId),['B','C','A']);
    // Moment about A gives RBy=7920/96=82.5. Its +normal (.6,.8)
    // sets RBx=61.875. Joint statics give tension-positive AB +171.875,
    // AC -62.5 and BC -137.5. Axial compatibility sets Bx from AB
    // extension, By=-.75 Bx, then resolves the two C projections.
    const [b,c,a]=nodalDisplacements;
    near(b.uxIn,.0171875); near(b.uyIn,-.012890625);
    near(.6*b.uxIn+.8*b.uyIn,0);
    near(.8*b.uxIn-.6*b.uyIn,.021484375);
    near(c.uxIn,.016357421875); near(c.uyIn,-.0283203125);
    near(a.uxIn,0); near(a.uyIn,0);
    for(const row of nodalDisplacements) assert.equal(row.rotationRad,null);

    assert.deepEqual(memberDisplacements.map(row=>[row.memberId,row.startNodeId,row.endNodeId]),
      bars.map(([id,start,end])=>[id,start,end]));
    // AB and AC start at A. BC start value is dot(B,[-.8,.6]),
    // not the global Bx; its signed extension adds -137.5*60/960000.
    const oracle=[[0,.0171875,171.875],[0,-.00390625,-62.5],[-.021484375,-.030078125,-137.5]];
    for(const [index,row] of memberDisplacements.entries()){
      const length=bars[index][3], [first,last,force]=oracle[index];
      assert.deepEqual(row.samples.map(point=>point.stationIn),[length,length/2,0]);
      row.samples.forEach((point,i)=>near(point.axialIn,[last,(first+last)/2,first][i]));
      near(axialForce(row,length),force);
    }
    const [rb,ra]=reactions(support).map(row=>row.support);
    near(rb.fxLb,61.875); near(rb.fyLb,82.5);
    near(sign*(.6*rb.fxLb+.8*rb.fyLb),sign*103.125);
    near(.8*rb.fxLb-.6*rb.fyLb,0);
    near(ra.fxLb,-121.875); near(ra.fyLb,37.5);
  }
});

test('same vertical reaction does not establish the same bearing direction or bar force',()=>{
  const vertical={freeDx:1,freeDy:0};
  const data=run(vertical).cases[0];
  const [b]=data.nodalDisplacements, [ab]=data.memberDisplacements;
  const [{support:reaction}]=reactions(vertical);
  near(reaction.fyLb,82.5); near(reaction.fxLb,0);
  near(b.uxIn,.011); near(b.uyIn,0); near(axialForce(ab,96),110);
  assert.throws(()=>run({freeDx:0,freeDy:1}),/singular|unstable|mechanism|ill-conditioned/i);
});
