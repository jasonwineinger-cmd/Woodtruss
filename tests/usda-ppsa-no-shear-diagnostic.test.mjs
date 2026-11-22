import test from 'node:test';
import assert from 'node:assert/strict';
import {solveElasticFrame} from '../dist/analysis/src/elastic-frame-solve.js';
import {elasticFrameMemberPointLoad} from '../dist/analysis/src/elastic-frame-member-point-load.js';
import {recoverElasticFrameSectionDemand} from '../dist/analysis/src/elastic-frame-section-demand.js';

// FPL-GTR-40 Figure 5 and Tables I–VI. These independently transcribed public
// inputs define an Euler–Bernoulli comparison, NOT a replay of legacy shear.
const points=[[0,0],[0,50.01],[70.25,26.6],[140.5,3.18],[140.5,0],[70.25,0]];
const incidence=[[1,2,4],[2,3,1],[3,4,1],[5,4,3],[6,5,2],[1,6,2],[1,3,4],[6,3,4]];
const moduli=[0,1_800_000,1_800_000,18_000_000,1_600_000];
const n=id=>`N${id}`;
const model={
  nodes:points.map(([xIn,yIn],index)=>({id:n(index+1),xIn,yIn})),
  members:incidence.map(([a,b,group],index)=>({
    id:`M${index+1}`,startNodeId:n(a),endNodeId:n(b),areaIn2:1.5*3.5,secondMomentIn4:1.5*3.5**3/12,
    elasticModulusPsi:moduli[group],releaseStartRotation:index===6,releaseEndRotation:index===6,
  })),
  supports:[
    {nodeId:n(1),fixX:true,fixY:true,fixRotation:false},
    {nodeId:n(2),freeDx:0,freeDy:1,fixRotation:false},
    {nodeId:n(5),freeDx:12,freeDy:2,fixRotation:false},
  ],
  loads:[{nodeId:n(4),fxLb:0,fyLb:-128.8,momentLbIn:-1657.7}],
  memberLoads:['M2','M3'].map(memberId=>({memberId,basis:'horizontal-projection',qxLbPerIn:0,qyLbPerIn:-5})),
  memberPointLoads:[{memberId:'M6',stationIn:46.25,fxLb:0,fyLb:-550}],
};
const near=(actual,expected,tolerance,label)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<tolerance,
  `${label}: expected ${expected}, received ${actual}`);

test('published USDA input geometry agrees with independent no-shear diagnostic, not original shear outputs',()=>{
  const result=solveElasticFrame(model);
  const {N1:pin,N2:upper,N5:slope}=result.reactions;
  // Independent strain-energy implementation (no shear, explicit projected basis)
  // reports this rounded pin reaction; other scalar reactions follow statics.
  const independentPinX=878.3392, independentPinY=998.3205;
  const independentSlopeY=1381.3-independentPinY;
  near(pin.fxLb,independentPinX,0.0001,'pin x');
  near(pin.fyLb,independentPinY,0.0001,'pin y');
  near(slope.fyLb,independentSlopeY,0.0001,'slope y');
  near(slope.fxLb,-independentSlopeY/6,0.0001,'slope x');
  near(upper.fxLb,-independentPinX+independentSlopeY/6,0.0001,'upper x');
  near(-50.01*upper.fxLb+140.5*slope.fyLb,94542.225,1e-7,'physical support moment');
  near(-2*result.displacements.N5.uxIn+12*result.displacements.N5.uyIn,0,1e-12,'normal displacement');
  for(const id of ['N1','N3']) assert.ok(Number.isFinite(result.displacements[id].rotationRad)&&
    Math.abs(result.displacements[id].rotationRad)>1e-5,'member 7 does not detach joint rotation');
  // Original Table VII is intentionally not an acceptance target for this model.
  assert.ok(Math.abs(pin.fxLb-896.178)>17 && Math.abs(pin.fyLb-1005.070)>6);
  assert.equal(result.equilibrium.passes,true);
  assert.equal(result.fabricationAuthorized,false);
});

test('USDA no-shear end-action diagnostic uses consistent local signs and physical closure',()=>{
  const {memberEndActions, displacements}=solveElasticFrame(model);
  const loaded=memberEndActions.M6;
  assert.equal(loaded.startNodeId,'N1');
  assert.equal(loaded.endNodeId,'N6');
  const [nL,vL,mL,nR,vR,mR]=loaded.localEndActions;
  near(nL+nR,0,1e-8,'M6 unforced axial balance');
  near(vL+vR,550,1e-8,'M6 force balance at printed point load');
  near(mL+mR+70.25*vR,550*46.25,1e-7,'M6 moment about printed start');
  const released=memberEndActions.M7;
  assert.deepEqual(released.releasedRotationIndices,[2,5]);
  const length=Math.hypot(70.25,26.6);
  const d=released.localDisplacements, a=released.localEndActions;
  for(const i of [1,2,4,5]) near(a[i],0,1e-8,'unloaded released member has no shear or end moments');
  near(a[0],-1_600_000*1.5*3.5*(d[3]-d[0])/length,1e-8,'M7 hand axial law');
  near(a[3],-a[0],1e-8,'M7 opposed end action');
  near(d[2],(d[4]-d[1])/length,1e-12,'M7 left private rotation');
  near(d[5],(d[4]-d[1])/length,1e-12,'M7 right private rotation');
  assert.ok(Math.abs(d[2]-displacements.N1.rotationRad)>1e-4);
  assert.equal(released.manufacturingApproved,false);
});

test('USDA mixed shear diagnostic matches an independent formulation but not legacy outputs',()=>{
  // Research hypothesis only. The legacy effective-area convention is not a default.
  // Unloaded, double-released M7 is explicitly modeled as the axial-only limit;
  // no shear-flexible released or loaded release is exercised by this case.
  assert.ok(![...model.memberLoads,...model.memberPointLoads].some(row=>row.memberId==='M7'));
  const members=model.members.map(m=>m.id==='M7'?m:{...m,
    shear:{shearModulusPsi:m.elasticModulusPsi/16,effectiveShearAreaIn2:m.areaIn2/(6/5)},
  });
  const r=solveElasticFrame({...model,members});
  const {N1:pin,N2:upper,N5:slope}=r.reactions;
  near(pin.fxLb,892.2915,.0001,'independent shear reference pin x');
  near(pin.fyLb,1003.6000,.0001,'independent shear reference pin y');
  near(upper.fxLb,-829.3415,.0001,'independent shear reference upper x');
  near(slope.fxLb,-62.950,.0001,'independent shear reference inclined x');
  near(slope.fyLb,377.700,.0001,'independent shear reference inclined y');
  near(-50.01*upper.fxLb+140.5*slope.fyLb,94542.225,1e-7,'physical reference support moment');
  const {uxIn,uyIn}=r.displacements.N5;
  near((-2*uxIn+12*uyIn)/Math.hypot(12,2),0,1e-12,'inclined support normal displacement');
  near((12*uxIn+2*uyIn)/Math.hypot(12,2),.0037147,1e-7,'independent tangent displacement');
  const [nL,vL,mL,nR,vR,mR]=r.memberEndActions.M6.localEndActions;
  near(nL+nR,0,1e-8,'M6 axial balance');
  near(vL+vR,550,1e-8,'M6 force balance');
  near(mL+mR+70.25*vR,550*46.25,1e-7,'M6 moment about its authored start');
  const released=r.memberEndActions.M7;
  assert.equal(r.memberEndActions.M4.shearDeformationModeled,true);
  assert.equal(released.shearDeformationModeled,false);
  assert.deepEqual(released.releasedRotationIndices,[2,5]);
  near(released.localEndActions[0],1208.054,.001,'M7 independent axial comparison');
  for(const i of [1,2,4,5]) near(released.localEndActions[i],0,1e-8,'unloaded axial-only M7');
  assert.ok(Math.abs(pin.fxLb-896.178)>3 && Math.abs(pin.fyLb-1005.070)>1);
  assert.equal(r.equilibrium.passes,true);
  assert.equal(r.fabricationAuthorized,false);
});

function historicalOutputDiagnostic(rectangularCompliance) {
  // Only this test uses the 1972 printed bending-only equivalent point loads
  // with separately shear-flexible stiffness. This is not an API mode.
  const {globalEquivalentLoad: f,localEquivalentLoad,physicalResultant}=elasticFrameMemberPointLoad({
    left:{xIn:0,yIn:0},right:{xIn:70.25,yIn:0},stationIn:46.25,fxLb:0,fyLb:-550,
    releaseLeftRotation:false,releaseRightRotation:false,
  });
  near(f[1]+f[4],physicalResultant.fyLb,1e-9,'old point resultant force');
  near(f[2]+f[5]+70.25*f[4],physicalResultant.momentAboutLeftLbIn,1e-8,'old point resultant moment');
  const result=solveElasticFrame({...model,
    members:model.members.map(m=>({...m,shear:{
      shearModulusPsi:m.elasticModulusPsi/20,effectiveShearAreaIn2:m.areaIn2/rectangularCompliance,
    }})),
    memberPointLoads:[],
    loads:[...model.loads,
      {nodeId:'N1',fxLb:f[0],fyLb:f[1],momentLbIn:f[2]},
      {nodeId:'N6',fxLb:f[3],fyLb:f[4],momentLbIn:f[5]},
    ],
  });
  // Undo the diagnostic substitution only in M6 reporting: its two nodal
  // equivalents represent an actual applied load inside this member.
  const correctedActions=model.members.map(({id})=>result.memberEndActions[id].localEndActions
    .map((action,i)=>id==='M6'?action-localEquivalentLoad[i]:action));
  const [,vL,mL,,vR,mR]=correctedActions[5];
  near(vL+vR,550,1e-8,'corrected M6 physical force');
  near(mL+mR+70.25*vR,25437.5,1e-7,'corrected M6 physical moment');
  assert.equal(result.equilibrium.passes,true);
  assert.equal(result.fabricationAuthorized,false);
  return {result,correctedActions};
}

test('1972 published predecessor closes with its printed E/20 and bending-only fixed-end load convention',()=>{
  const {result:r,correctedActions:a}=historicalOutputDiagnostic(1);
  const {N1:pin,N2:upper,N5:slope}=r.reactions;
  near(pin.fxLb,893.493,.001,'FPL168 pin x');
  near(pin.fyLb,1004.055,.001,'FPL168 pin y');
  near(upper.fxLb,-830.619,.001,'FPL168 upper x');
  near(slope.fxLb,-62.874,.001,'FPL168 slope x');
  near(slope.fyLb,377.245,.001,'FPL168 slope y');
  near(a[6][0],1210.303,.001,'FPL168 M7 compression');
});

test('1984 hypothesis reproduces all 48 Table VIII entries within a last printed unit, not its documented settings',()=>{
  const {result:r,correctedActions:a}=historicalOutputDiagnostic(6/5);
  const reported=[
    [418.043,-81.173,-2401.636,-418.043,81.173,-1657.831],
    [-845.877,158.765,1657.831,734.830,174.470,-2239.288],
    [196.611,150.992,1506.153,-307.700,182.228,-2662.691],
    [398.990,234.272,-260.005,-398.990,-234.272,1004.991],
    [-171.567,22.761,1338.925,171.567,-22.761,260.005],
    [-316.166,158.712,2401.636,316.166,391.288,-4452.126],
    [1209.546,0,0,-1209.546,0,0],
    [-414.049,144.599,3113.201,414.049,-144.599,733.136],
  ];
  a.forEach((row,i)=>row.forEach((value,j)=>near(value,reported[i][j],.001,`PPSA II M${i+1} end slot ${j}`)));
  const {N1:pin,N2:upper,N5:slope}=r.reactions;
  near(pin.fxLb,896.178,.001,'PPSA II pin x');
  near(pin.fyLb,1005.070,.001,'PPSA II pin y');
  near(upper.fxLb,-833.472,.001,'PPSA II upper x');
  near(slope.fxLb,-62.705,.001,'PPSA II slope x');
  near(slope.fyLb,376.230,.001,'PPSA II slope y');
  near(-50.01*upper.fxLb+140.5*slope.fyLb,94542.225,1e-7,'physical support moment');
  assert.equal(r.memberEndActions.M7.shearDeformationModeled,true);
  assert.deepEqual(r.memberEndActions.M7.releasedRotationIndices,[2,5]);
});

test('USDA sampled comparison does not bound the exact moment at the applied point force',()=>{
  const {correctedActions}=historicalOutputDiagnostic(6/5);
  const lengthIn=70.25, stationIn=46.25;
  const action=correctedActions[5];
  // The historical reconstruction represented the physical point as supplied
  // nodal equivalents in solve; give section recovery the actual interior force.
  const demand=recoverElasticFrameSectionDemand({lengthIn,localEndActions:action,
    uniform:null,point:{stationIn,fxLb:0,fyLb:-550}});
  const peak=demand.extrema.momentLbIn.max;
  assert.equal(peak.stationIn,stationIn);
  near(peak.momentLbIn,4938.794,.03,'exact hand moment from Table VIII at load');
  // Table IX reports a sampling station, not the location of the actual peak.
  const reportedSample=(158.712*44.96-2401.636)/(1.5*3.5**2/6);
  near(reportedSample,1545.81,.01,'reported historical example stress arithmetic only');
  assert.ok(peak.momentLbIn>1.04*(158.712*44.96-2401.636));
});
