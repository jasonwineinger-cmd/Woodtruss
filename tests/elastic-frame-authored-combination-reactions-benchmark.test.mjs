import assert from 'node:assert/strict';
import test from 'node:test';
import {studyAuthoredElasticFrameCombinationReactions as study} from '../dist/analysis/src/elastic-frame-authored-combination-reactions.js';

const member = {id:'beam',startNodeId:'A',endNodeId:'B',areaIn2:8,
  secondMomentIn4:32/3,elasticModulusPsi:1.4e6};
const point=(stationIn,fxLb,fyLb)=>({memberId:'beam',stationIn,fxLb,fyLb});
const nodal=(fxLb,fyLb,momentLbIn)=>({nodeId:'B',fxLb,fyLb,momentLbIn});
const q=(qxLbPerIn,qyLbPerIn)=>({memberId:'beam',basis:'horizontal-projection',qxLbPerIn,qyLbPerIn});
const input={
  modelId:'independent-inclined-balance',modelRevision:'r1',originNodeId:'A',
  frame:{
    nodes:[{id:'A',xIn:0,yIn:0},{id:'B',xIn:6,yIn:8}],members:[member],
    supports:[{nodeId:'A',fixX:true,fixY:true,fixRotation:true}],
  },
  sources:[
    {caseId:'second',sourceRef:'Synthetic sheet B',loads:[],memberLoads:[q(-1,2)],memberPointLoads:[point(2,-3,2)]},
    {caseId:'first',sourceRef:'Synthetic sheet A',loads:[nodal(3.5,-2.5,6)],
      memberLoads:[q(2,-3)],memberPointLoads:[point(2,5,-4)]},
  ],
  combinations:[{caseId:'balance-check',sourceRef:'Independently authored example',
    terms:[{caseId:'first',factor:2},{caseId:'second',factor:-.5}]}],
};
const near=(actual,expected)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<1e-8,
  `${actual} does not match independent balance ${expected}`);
function vector(actual,[x,y,m]){
  near(actual.fxLb,x);near(actual.fyLb,y);near(actual.momentLbIn,m);
}
function transport([x,y,m],dx,dy){return [x,y,m-dx*y+dy*x];}

test('inclined combination uses physical projected load and exact point and nodal moment arms at two origins',()=>{
  const first=study(structuredClone(input));
  assert.equal(first.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(first.fabricationAuthorized,false);
  assert.equal(first.modelId,input.modelId);
  assert.equal(first.modelRevision,input.modelRevision);
  assert.deepEqual(first.combinationProvenance,[{
    caseId:'balance-check',sourceRef:'Independently authored example',terms:[
      {caseId:'first',sourceRef:'Synthetic sheet A',factor:2},
      {caseId:'second',sourceRef:'Synthetic sheet B',factor:-.5},
    ],
  }]);
  const [a]=first.cases;
  assert.equal(a.caseId,'balance-check');
  assert.equal(a.originNodeId,'A');
  // Horizontal UDL measure 6, not the 10-in centerline; resultant (+27,-42)
  // acts at (3,4). Point (+11.5,-9) acts at (1.2,1.6), not an end.
  // Nodal (+7,-5) and +12 couple at (6,8) give another -74 lb-in about A.
  const applied=[27+11.5+7,-42-9-5,-234-29.2-74];
  const support=applied.map(v=>-v);
  vector(a.applied,applied);
  vector(a.support,support);
  vector(a.residual,[0,0,0]);
  assert.equal(a.appliedRows.length,3);
  assert.equal(a.supportRows.length,1);
  assert.deepEqual(a.appliedRows.map(row=>row.kind),['nodal','uniform','point']);
  const [tip,uniform,pointRow]=a.appliedRows;
  assert.equal(tip.nodeId,'B');
  assert.equal(tip.coupleLbIn,12);
  vector(tip,[7,-5,-74]);
  assert.equal(uniform.basis,'horizontal-projection');
  assert.equal(uniform.loadedMeasureIn,6);
  vector(uniform,[27,-42,-234]);
  assert.equal(pointRow.stationIn,2);
  near(pointRow.xFromOriginIn,1.2);
  near(pointRow.yFromOriginIn,1.6);
  vector(pointRow,[11.5,-9,-29.2]);
  assert.equal(a.supportRows[0].nodeId,'A');
  near(a.supportRows[0].coupleLbIn,337.2);

  const [b]=study({...structuredClone(input),originNodeId:'B'}).cases;
  assert.equal(b.originNodeId,'B');
  vector(b.applied,transport(applied,6,8)); // +362.8 CCW lb-in
  vector(b.support,transport(support,6,8)); // -362.8 CCW lb-in
  vector(b.residual,[0,0,0]);
});

test('pin and roller share a laterally applied point and a separate signed tip couple',()=>{
  const result=study({
    ...structuredClone(input),
    originNodeId:'B',
    frame:{nodes:[{id:'A',xIn:0,yIn:0},{id:'B',xIn:12,yIn:0}],members:[member],supports:[
      {nodeId:'A',fixX:true,fixY:true,fixRotation:false},{nodeId:'B',fixX:false,fixY:true,fixRotation:false},
    ]},
    sources:[{caseId:'source',sourceRef:'Synthetic pin/roller',loads:[nodal(0,0,6)],
      memberPointLoads:[point(3,4,-8)]}],
    combinations:[{caseId:'weighted',sourceRef:'Authored scale',terms:[{caseId:'source',factor:1.5}]}],
  });
  const [row]=result.cases;
  // (Fx,Fy)=(6,-12), tip couple +9, M about B=9+(-9)*(-12)=117.
  // Left support is (+9.75)y, right support (+2.25)y, neither has a moment.
  vector(row.applied,[6,-12,117]);
  vector(row.support,[-6,12,-117]);
  vector(row.residual,[0,0,0]);
  assert.equal(row.supportRows.length,2);
  assert.deepEqual(row.supportRows.map(item=>item.nodeId),['A','B']);
  vector(row.supportRows[0],[-6,9.75,-117]);
  vector(row.supportRows[1],[0,2.25,0]);
  row.supportRows.forEach(item=>assert.equal(item.coupleLbIn,0));
});
