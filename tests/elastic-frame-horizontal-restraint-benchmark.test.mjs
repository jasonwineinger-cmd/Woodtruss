import assert from 'node:assert/strict';
import test from 'node:test';
import {studyElasticFrameHorizontalRestraint as study} from '../dist/analysis/src/elastic-frame-horizontal-restraint-study.js';

const input={
  modelId:'synthetic-axial-restraint',modelRevision:'r1',caseId:'explicit-nodal-force',
  sourceRef:'Hand-authored synthetic elastic benchmark, not USDA measurements',
  frame:{
    nodes:[{id:'L',xIn:0,yIn:0},{id:'R',xIn:100,yIn:0}],
    members:[{id:'LR',startNodeId:'L',endNodeId:'R',areaIn2:2,
      secondMomentIn4:10,elasticModulusPsi:1e6}],
    supports:[{nodeId:'L',fixX:true,fixY:true,fixRotation:false},
      {nodeId:'R',fixX:false,fixY:true,fixRotation:false}],
  },
  loads:[{nodeId:'R',fxLb:400,fyLb:0,momentLbIn:0}],
  bearingNodeId:'R',originNodeId:'L',
};
function near(actual,expected,tolerance=1e-8){
  assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance,
    `${actual} does not match independent elastic result ${expected}`);
}
function vector(actual,[x,y,m]){
  near(actual.fxLb,x);near(actual.fyLb,y);near(actual.momentLbIn,m);
}

test('exact axial F L/EA and unit flexibility reproduce free, finite and rigid bearing restraints',()=>{
  // EA=2,000,000 lb, length=100 in: at a displacement-compatible force
  // spring, u=(F-k*u)L/EA; for rigid, u=0 and the restraint applies -F.
  const f=1/20000;
  for(const [restraint,ux,correction] of [
    [{kind:'free'},.02,0],
    [{kind:'spring',stiffnessLbPerIn:20000},.01,-200],
    [{kind:'rigid'},0,-400],
  ]){
    const out=study({...structuredClone(input),restraint});
    assert.equal(out.status,'PRELIMINARY_NOT_ENGINEERED');
    assert.equal(out.fabricationAuthorized,false);
    assert.equal(out.caseId,input.caseId);
    assert.equal(out.sourceRef,input.sourceRef);
    assert.equal(out.bearingNodeId,'R');
    assert.equal(out.originNodeId,'L');
    near(out.unrestrainedUxIn,.02);
    near(out.flexibilityInPerLb,f,1e-12);
    near(out.predictedUxIn,ux,1e-10);
    near(out.restrainedUxIn,ux,1e-10);
    near(out.restraintForceLb,correction);
    if (restraint.kind==='free') assert.equal(out.injectedRestraintAction,null);
    else {
      assert.equal(out.injectedRestraintAction.nodeId,'R');
      vector(out.injectedRestraintAction,[correction,0,0]);
    }
    vector(out.physicalResultant.applied,[400+correction,0,0]);
    vector(out.physicalResultant.support,[-400-correction,0,0]);
    vector(out.physicalResultant.residual,[0,0,0]);
  }
});

test('negative applied X gets a positive spring force without absorbing a vertical load or couple',()=>{
  const out=study({...structuredClone(input),restraint:{kind:'spring',stiffnessLbPerIn:20000},
    loads:[{nodeId:'R',fxLb:-200,fyLb:-50,momentLbIn:-30}]});
  near(out.unrestrainedUxIn,-.01,1e-10);
  near(out.restrainedUxIn,-.005,1e-10);
  near(out.restraintForceLb,100);
  vector(out.injectedRestraintAction,[100,0,0]);
  vector(out.physicalResultant.applied,[-100,-50,-5030]);
  // About L: 100*(-50)-30=-5030; the end applied couple is not a force arm.
  // Thus R_y=50.3 and L_y=-0.3, unaffected by this horizontal spring.
  const support=Object.fromEntries(out.physicalResultant.supportRows.map(row=>[row.nodeId,row]));
  vector(support.L,[100,-.3,0]);
  vector(support.R,[0,50.3,5030]);
  vector(out.physicalResultant.residual,[0,0,0]);
});

test('an existing X restraint or invalid spring cannot be reinterpreted as an unrestrained reference',()=>{
  const held=structuredClone(input);
  held.frame.supports[1].fixX=true;
  assert.throws(()=>study({...held,restraint:{kind:'rigid'}}));
  assert.throws(()=>study({...structuredClone(input),restraint:{kind:'spring',stiffnessLbPerIn:0}}));
});
