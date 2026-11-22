import test from 'node:test';
import assert from 'node:assert/strict';
import {solveElasticFrame} from '../dist/analysis/src/elastic-frame-solve.js';

const beam = {areaIn2:4, secondMomentIn4:24, elasticModulusPsi:1_200_000};
const link = {areaIn2:3, secondMomentIn4:10, elasticModulusPsi:1_000_000};
const load = {nodeId:'B',fxLb:82,fyLb:-53,momentLbIn:360};
const model = {
  nodes:[{id:'A',xIn:20,yIn:15},{id:'B',xIn:120,yIn:15},{id:'C',xIn:159,yIn:67}],
  members:[{id:'AB',startNodeId:'A',endNodeId:'B',...beam},
    {id:'BC',startNodeId:'B',endNodeId:'C',...link,releaseStartRotation:true,releaseEndRotation:true}],
  supports:[{nodeId:'A',fixX:true,fixY:true,fixRotation:true},
    {nodeId:'C',fixX:true,fixY:true,fixRotation:false}],
  loads:[load],
};
const near = (actual,expected,label,tolerance=1e-9) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual-expected)<=tolerance,
    `${label}: expected ${expected}, received ${actual}`);
const nearVector = (actual,expected,label,tolerance) => {
  assert.equal(actual.length,expected.length);
  expected.forEach((value,i)=>near(actual[i],value,`${label} [${i}]`,tolerance));
};

test('recovered released rotations are private to the inclined link and signed actions close at the shared joint',()=>{
  const out=solveElasticFrame(model);
  const {AB,BC}=out.memberEndActions;
  const {uxIn:ux,uyIn:uy,rotationRad:theta}=out.displacements.B;
  assert.equal(out.displacements.C.rotationRad,null);
  nearVector(AB.localDisplacements,[0,0,0,ux,uy,theta],'beam retains shared joint rotation');

  // BC rises 52 in over a signed 39 in run. With no member load, its
  // section rotations are equal to the linearized local chord rotation;
  // neither is constrained to the actual rotation of the B node.
  const c=.6,s=.8,L=65;
  const u=c*ux+s*uy,v=-s*ux+c*uy;
  const chord=-v/L;
  nearVector(BC.localDisplacements,[u,v,chord,0,0,chord],'released link element kinematics');
  assert.ok(Math.abs(theta-chord)>1e-7,'fixture distinguishes shared and private rotations');

  const N=link.elasticModulusPsi*link.areaIn2*(-u)/L;
  nearVector(BC.localEndActions,[-N,0,0,N,0,0],'inclined link independent axial action',1e-7);
  const [bX,bY,bM]=AB.localEndActions.slice(3);
  nearVector([bX+c*BC.localEndActions[0]-s*BC.localEndActions[1],
    bY+s*BC.localEndActions[0]+c*BC.localEndActions[1],bM+BC.localEndActions[2]],
  [load.fxLb,load.fyLb,load.momentLbIn],'signed global X/Y/couple closure at B',1e-7);
  nearVector(AB.localEndActions.slice(0,3),
    [out.reactions.A.fxLb,out.reactions.A.fyLb,out.reactions.A.momentLbIn],'A end equals reaction',1e-7);
  nearVector([c*N,s*N,0],
    [out.reactions.C.fxLb,out.reactions.C.fyLb,out.reactions.C.momentLbIn],'C end equals reaction',1e-7);

  const flipped=solveElasticFrame({...model,members:[model.members[0],
    {...model.members[1],startNodeId:'C',endNodeId:'B'}]});
  const reversedBasis = ([x1,y1,r1,x2,y2,r2])=>[-x2,-y2,r2,-x1,-y1,r1];
  nearVector(flipped.memberEndActions.BC.localDisplacements,reversedBasis(BC.localDisplacements),'reversed link kinematics');
  nearVector(flipped.memberEndActions.BC.localEndActions,reversedBasis(BC.localEndActions),'reversed link forces',1e-7);
  nearVector(flipped.memberEndActions.AB.localEndActions,AB.localEndActions,'unchanged beam forces',1e-7);
  assert.equal(out.equilibrium.passes,true);
  assert.equal(flipped.equilibrium.passes,true);
  assert.equal(flipped.fabricationAuthorized,false);
});
