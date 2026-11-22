import assert from 'node:assert/strict';
import test from 'node:test';
import {solveElasticFrame as solve} from '../dist/analysis/src/elastic-frame-solve.js';
import {studyScissorModeledThreeGaugeRestraint as study} from '../dist/analysis/src/scissor-modeled-three-gauge-restraint-study.js';

const nodes=[
  ['L',0,0],['Q1',60,30],['R',120,60],['Q3',180,30],['E',240,0],
  ['B1',60,15],['B2',120,30],['B3',180,15],
].map(([id,xIn,yIn])=>({id,xIn,yIn}));
const memberAssignments=[
  ['top','L','Q1'],['top','Q1','R'],['top','R','Q3'],['top','Q3','E'],
  ['bottom','L','B1'],['bottom','B1','B2'],['bottom','B2','B3'],['bottom','B3','E'],
  ['web','Q1','B1'],['web','Q1','B2'],['web','R','B2'],['web','Q3','B2'],['web','Q3','B3'],
].map(([kind,startNodeId,endNodeId],i)=>({
  memberId:`${kind}-${startNodeId}-${endNodeId}`,startNodeId,endNodeId,
  areaIn2:8+i/16,secondMomentIn4:12+i/16,elasticModulusPsi:1200000+1000*i,
  releaseStartRotation:false,releaseEndRotation:false,
}));
const supports=[{nodeId:'L',fixX:true,fixY:true,fixRotation:false},
  {nodeId:'E',fixX:false,fixY:true,fixRotation:false}];
const gauges=[{gaugeId:'left-quarter',nodeId:'Q1'},{gaugeId:'ridge',nodeId:'R'},{gaugeId:'right-quarter',nodeId:'Q3'}];
const nodal=(nodeId,fxLb,fyLb)=>({nodeId,fxLb,fyLb,momentLbIn:0});
const frame={nodes,members:memberAssignments.map(({memberId,...props})=>({id:memberId,...props})),supports};
const k=25000;
const fixture={
  modelId:'synthetic-modeled-three-gauge',modelRevision:'test-r1',
  roof:{family:'scissor',spanFt:20,pitchRisePer12:6,bottomPitchRisePer12:3},
  memberAssignments,supports,bearingNodeId:'E',originNodeId:'L',restraint:{kind:'spring',stiffnessLbPerIn:k},gauges,
  sources:[
    {caseId:'ridge-source',sourceRef:'Synthetic ridge force',loads:[nodal('R',50,-200)]},
    {caseId:'quarter-source',sourceRef:'Synthetic quarter force',loads:[nodal('Q1',10,-20)]},
  ],
  combinations:[
    {caseId:'down',sourceRef:'Explicit synthetic down case',terms:[{caseId:'quarter-source',factor:.5},{caseId:'ridge-source',factor:1.5}]},
    {caseId:'up',sourceRef:'Explicit synthetic up case',terms:[{caseId:'ridge-source',factor:-.5},{caseId:'quarter-source',factor:2}]},
  ],
};
function near(actual,expected,tolerance=1e-9) {
  assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance,
    `${actual} does not match independent comparison ${expected}`);
}

test('true scissor models three named gauges under explicit spring cases without relabeling them measurements',()=>{
  const result=study(structuredClone(fixture));
  assert.equal(result.family,'scissor');
  assert.equal(result.status,'PRELIMINARY_MODELED_NOT_OBSERVED');
  assert.equal(result.fabricationAuthorized,false);
  assert.deepEqual(result.rows.map(r=>r.caseId),['down','up']);
  assert.deepEqual(JSON.parse(JSON.stringify(result.caseProvenance)),[
    {caseId:'down',sourceRef:'Explicit synthetic down case',terms:[
      {caseId:'quarter-source',sourceRef:'Synthetic quarter force',factor:.5},
      {caseId:'ridge-source',sourceRef:'Synthetic ridge force',factor:1.5}]},
    {caseId:'up',sourceRef:'Explicit synthetic up case',terms:[
      {caseId:'ridge-source',sourceRef:'Synthetic ridge force',factor:-.5},
      {caseId:'quarter-source',sourceRef:'Synthetic quarter force',factor:2}]},
  ]);

  // A 1-lb horizontal test action determines flexibility in the same actual
  // baseline solver, independent of the scissor restraint/gauge wrapper.
  const flexibility=solve({...frame,loads:[nodal('E',1,0)]}).displacements.E.uxIn;
  assert.ok(flexibility>0);
  const ordinaryCases=[
    {loads:[nodal('Q1',5,-10),nodal('R',75,-300)],bearings:[138.125,171.875]},
    {loads:[nodal('R',-25,100),nodal('Q1',20,-40)],bearings:[-16.25,-43.75]},
  ];
  result.rows.forEach((row,i)=>{
    const {loads,bearings}=ordinaryCases[i];
    const free=solve({...frame,loads});
    // u=u0+fR, R=-ku. No vertical component in the injection.
    const reaction=-k*free.displacements.E.uxIn/(1+k*flexibility);
    near(row.restraintForceLb,reaction,1e-7);
    const restrained=solve({...frame,loads:[...loads,nodal('E',reaction,0)]});
    assert.deepEqual(row.bearingVerticalReactionsLb.map(r=>r.nodeId),['L','E']);
    row.bearingVerticalReactionsLb.forEach((r,j)=>near(r.fyLb,bearings[j],1e-7));
    near(row.totalBearingReactionLb,bearings[0]+bearings[1],1e-7);
    for (const [projected,direct] of [[row.unrestrained,free],[row.restrained,restrained]]) {
      assert.deepEqual(projected.gauges.map(({gaugeId,nodeId})=>({gaugeId,nodeId})),gauges);
      const values=gauges.map(({nodeId})=>-direct.displacements[nodeId].uyIn);
      values.forEach((v,j)=>near(projected.gauges[j].downwardIn,v));
      near(projected.averageDownwardIn,values.reduce((sum,v)=>sum+v,0)/3);
    }
    assert.ok(Math.abs(row.restrained.averageDownwardIn-row.unrestrained.averageDownwardIn)>1e-5);
  });
  // Hand vertical equilibrium, separate from direct-solve comparison:
  // Down case M_L=120(-300)-60(75)+60(-10)-30(5)=-41250; R_Ey=171.875.
  // Up case M_L=120(100)-60(-25)+60(-40)-30(20)=10500; R_Ey=-43.75.
  assert.ok(result.rows[0].restrained.averageDownwardIn>0);
  assert.ok(result.rows[1].restrained.averageDownwardIn<0);
});

test('a non-gauge joint or hidden support restraint is withheld',()=>{
  const changed=structuredClone(fixture);
  changed.gauges[0].nodeId='B1';
  assert.throws(()=>study(changed));
  const blocked=structuredClone(fixture);
  blocked.supports[1].fixX=true;
  assert.throws(()=>study(blocked));
});
