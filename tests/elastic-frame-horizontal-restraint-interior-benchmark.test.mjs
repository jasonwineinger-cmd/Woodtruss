import test from 'node:test';
import assert from 'node:assert/strict';
import { studyElasticFrameHorizontalRestraint as study } from '../dist/analysis/src/elastic-frame-horizontal-restraint-study.js';
import { solveElasticFrameHorizontalRestraint as solve } from "../dist/analysis/src/elastic-frame-horizontal-restraint-math.js";

const near=(a,b,tol=1e-9)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<tol,`${a} vs ${b}`);

test('a distinct right-bearing spring shares an interior axial load via both member flexibilities',()=>{
  const input={modelId:'two-segment-axial',modelRevision:'r01',caseId:'interior',
    sourceRef:'synthetic analytic check only',bearingNodeId:'R',originNodeId:'J',
    frame:{
      nodes:[{id:'L',xIn:0,yIn:0},{id:'J',xIn:30,yIn:0},{id:'R',xIn:80,yIn:0}],
      members:[{id:'LJ',startNodeId:'L',endNodeId:'J',areaIn2:2,secondMomentIn4:6,elasticModulusPsi:1e5},
        {id:'JR',startNodeId:'J',endNodeId:'R',areaIn2:1.2,secondMomentIn4:7,elasticModulusPsi:1e5}],
      supports:[{nodeId:'L',fixX:true,fixY:true,fixRotation:true},
        {nodeId:'R',fixX:false,fixY:true,fixRotation:false}],
    },
    loads:[{nodeId:'J',fxLb:120,fyLb:0,momentLbIn:0}]};
  const fL=30/200000,fR=50/120000;
  const freeRight=120*fL, f=fL+fR;
  for(const restraint of [{kind:'spring',stiffnessLbPerIn:1000},{kind:'rigid'}]){
    const result=study({...input,restraint});
    const expected=restraint.kind==='rigid'?0:freeRight/(1+restraint.stiffnessLbPerIn*f);
    const force=(expected-freeRight)/f;
    near(result.unrestrainedUxIn,freeRight);
    near(result.flexibilityInPerLb,f);
    near(result.predictedUxIn,expected);
    near(result.restrainedUxIn,expected);
    near(result.restraintForceLb,force);
    const authored=result.physicalResultant.appliedRows.find(row=>row.nodeId==='J');
    const spring=result.physicalResultant.appliedRows.find(row=>row.nodeId==='R');
    near(authored.fxLb,120);near(spring.fxLb,force);
    near(result.physicalResultant.support.fxLb,-120-force);
    near(result.physicalResultant.residual.fxLb,0);
    assert.equal(result.fabricationAuthorized,false);
  }
});

test('the pure spring law retains representable displacement and signed force when the stiffness product overflows',()=>{
  const r=solve({unrestrainedUxIn:1e100,flexibilityInPerLb:1e120,
    restraint:{kind:'spring',stiffnessLbPerIn:1e200}});
  near(r.predictedUxIn/1e-220,1,1e-14);
  near(r.restraintForceLb/-1e-20,1,1e-14);
});
