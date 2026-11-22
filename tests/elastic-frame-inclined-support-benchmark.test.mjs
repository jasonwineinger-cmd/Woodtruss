import test from 'node:test';
import assert from 'node:assert/strict';
import {solveElasticFrame} from '../dist/analysis/src/elastic-frame-solve.js';

const L = 100, a = 40;
const fx = 20, fy = -60, moment = 100;
const E = 1_000_000, A = 4, I = 20;
const properties = {elasticModulusPsi:E,areaIn2:A,secondMomentIn4:I};

const model = {
  nodes:[{id:'A',xIn:25,yIn:10},{id:'J',xIn:25+a,yIn:10},{id:'B',xIn:25+L,yIn:10}],
  members:[{id:'AJ',startNodeId:'A',endNodeId:'J',...properties},
    {id:'JB',startNodeId:'J',endNodeId:'B',...properties}],
  loads:[{nodeId:'J',fxLb:fx,fyLb:fy,momentLbIn:moment}],
};
const pin = {nodeId:'A',fixX:true,fixY:true,fixRotation:false};
const near = (actual,expected,label,tolerance=2e-10) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual-expected)<=tolerance,
    `${label}: expected ${expected}, received ${actual}`);

test('inclined ideal support gives analytical axial/flexural movements and signed reactions in either tangent direction',()=>{
  // The roller normal is (-3,4)/5, so moment equilibrium about A gives
  // B_y=23 lb and then B_x=-17.25 lb. Reversing tangent reverses the
  // normal basis but not its physical reaction vector.
  const By = -(a*fy+moment)/L;
  const Bx = -3*By/4;
  const Ax = -fx-Bx, Ay = -fy-By;
  const uj = (fx+Bx)*a/(E*A);
  const ub = uj+Bx*(L-a)/(E*A);
  const vb = 3*ub/4;

  // On a cut at x inches from A, M(x)=Ay*x + fy*<x-a> - M_J*H(x-a).
  // Integrate EI*v''=M twice. A_y displacement is zero; B_y
  // displacement is the axial/bending coupling from the support tangent.
  const bracket = (x,n) => Math.max(0,x-a)**n;
  const bend = x => (Ay*x**3/6+fy*bracket(x,3)/6-moment*bracket(x,2)/2)/(E*I);
  const thetaA = (vb-bend(L))/L;
  const thetaB = thetaA+(Ay*L**2/2+fy*bracket(L,2)/2-moment*bracket(L,1))/(E*I);

  for (const sign of [1,-1]) {
    const out=solveElasticFrame({...model,supports:[pin,
      {nodeId:'B',freeDx:4*sign,freeDy:3*sign,fixRotation:false}]});
    near(out.reactions.A.fxLb,Ax,'A horizontal reaction',1e-8);
    near(out.reactions.A.fyLb,Ay,'A vertical reaction',1e-8);
    near(out.reactions.B.fxLb,Bx,'B horizontal reaction',1e-8);
    near(out.reactions.B.fyLb,By,'B vertical reaction',1e-8);
    near(4*out.reactions.B.fxLb+3*out.reactions.B.fyLb,0,'B has no tangent reaction',1e-8);
    near(out.reactions.A.momentLbIn,0,'A has no moment',1e-8);
    near(out.reactions.B.momentLbIn,0,'B has no moment',1e-8);
    near(out.displacements.J.uxIn,uj,'interior axial movement');
    near(out.displacements.J.uyIn,thetaA*a+bend(a),'interior vertical movement');
    near(out.displacements.B.uxIn,ub,'roller axial movement');
    near(out.displacements.B.uyIn,vb,'roller vertical movement');
    near(-3*out.displacements.B.uxIn+4*out.displacements.B.uyIn,0,'B has no normal displacement');
    near(out.displacements.A.rotationRad,thetaA,'A rotation');
    near(out.displacements.B.rotationRad,thetaB,'B rotation');
    assert.equal(out.equilibrium.passes,true);
    assert.equal(out.fabricationAuthorized,false);
  }
});

test('vertical free tangent on the horizontal beam does not restrain rigid rotation about A',()=>{
  assert.throws(()=>solveElasticFrame({...model,supports:[pin,
    {nodeId:'B',freeDx:0,freeDy:1,fixRotation:false}]}),/unstable|singular|mechanism|ill-conditioned/i);
});

test('oblique restraint closes combined nodal, uniform and interior force on one rigid member',()=>{
  const length=80, station=30, qy=-4, Fy=-175, nodalCouple=-250;
  const areaIn2=4, elasticModulusPsi=1350000;
  const result=solveElasticFrame({
    nodes:[{id:'A',xIn:12,yIn:25},{id:'B',xIn:12+length,yIn:25}],
    members:[{id:'AB',startNodeId:'A',endNodeId:'B',areaIn2,elasticModulusPsi,secondMomentIn4:18}],
    supports:[pin,{nodeId:'B',freeDx:4,freeDy:3,fixRotation:false}],
    loads:[{nodeId:'A',fxLb:0,fyLb:0,momentLbIn:nodalCouple}],
    memberLoads:[{memberId:'AB',basis:'member-length',qxLbPerIn:0,qyLbPerIn:qy}],
    memberPointLoads:[{memberId:'AB',stationIn:station,fxLb:0,fyLb:Fy}],
  });
  const By=-(qy*length**2/2+Fy*station+nodalCouple)/length;
  const Bx=-0.75*By;
  near(result.reactions.B.fyLb,By,'combined B vertical',1e-8);
  near(result.reactions.B.fxLb,Bx,'combined B horizontal',1e-8);
  near(result.reactions.A.fyLb,-By-qy*length-Fy,'combined A vertical',1e-8);
  near(result.reactions.A.fxLb,-Bx,'combined A horizontal',1e-8);
  near(result.displacements.B.uxIn,Bx*length/(areaIn2*elasticModulusPsi),'combined B axial');
  near(result.displacements.B.uyIn,.75*result.displacements.B.uxIn,'combined B follows tangent');
  assert.equal(result.equilibrium.passes,true);
});

test('inclined restraints and member point input reject ambiguous or unusable declarations',()=>{
  for(const support of [
    {nodeId:'B',freeDx:0,freeDy:0,fixRotation:false},
    {nodeId:'B',freeDx:Infinity,freeDy:1,fixRotation:false},
    {nodeId:'B',freeDx:Number.MIN_VALUE,freeDy:Number.MAX_VALUE,fixRotation:false},
    {nodeId:'B',freeDx:4,freeDy:3,fixRotation:false,fixY:true},
    {nodeId:'B',freeDx:4,freeDy:3,fixRotation:false,settlementIn:.25},
  ]) assert.throws(()=>solveElasticFrame({...model,supports:[pin,support]}),/direction|axis|support/i);
  for (const pointLoad of [
    {memberId:'unknown',stationIn:20,fxLb:2,fyLb:-4},
    {memberId:model.members[0].id,stationIn:0,fxLb:2,fyLb:-4},
    {memberId:model.members[0].id,stationIn:20,fxLb:2,fyLb:-4,eccentricityIn:1},
  ]) assert.throws(()=>solveElasticFrame({...model,supports:[pin,{nodeId:"B",freeDx:4,freeDy:3,fixRotation:false}],memberPointLoads:[pointLoad]}),
    /point.loaded frame member|interior station|point load/i);
});
