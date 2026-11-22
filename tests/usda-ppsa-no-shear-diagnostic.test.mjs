import test from 'node:test';
import assert from 'node:assert/strict';
import {solveElasticFrame} from '../dist/analysis/src/elastic-frame-solve.js';

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
