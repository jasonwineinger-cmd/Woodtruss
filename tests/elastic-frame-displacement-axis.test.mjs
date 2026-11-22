import test from 'node:test';
import assert from 'node:assert/strict';
import {solveElasticFrame} from '../dist/analysis/src/elastic-frame-solve.js';

const L=100, c=-.6, s=.8;
const E=1_400_000, A=4, I=22;
const axial=-45, transverse=23, couple=-110;
const stationsIn=[0,17,56,100];
const near=(actual,expected,label)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<2e-10,
  `${label}: ${actual} vs ${expected}`);

const model={
  nodes:[{id:'fixed',xIn:150,yIn:17},{id:'tip',xIn:90,yIn:97}],
  members:[{id:'incline',startNodeId:'fixed',endNodeId:'tip',areaIn2:A,secondMomentIn4:I,elasticModulusPsi:E}],
  supports:[{nodeId:'fixed',fixX:true,fixY:true,fixRotation:true}],
  loads:[{nodeId:'tip',fxLb:c*axial-s*transverse,fyLb:s*axial+c*transverse,momentLbIn:couple}],
};
const solve=(input,stations)=>solveElasticFrame({...input,memberDisplacementStations:[{memberId:'incline',stationsIn:stations}]});

function analyticAt(x){
  // Small linear Euler–Bernoulli response: N(x)=axial and
  // EI v''(x)=P(L-x)+M with both displacement and slope zero at fixed end.
  return {
    axialIn:axial*x/(E*A),
    transverseIn:(transverse*x*x*(3*L-x)/6+couple*x*x/2)/(E*I),
    rotationRad:(transverse*x*(2*L-x)/2+couple*x)/(E*I),
  };
}

test('inclined cantilever local displacement at authored stations matches independent axial and bending integration',()=>{
  const out=solve(model,stationsIn);
  const rows=out.memberSectionDisplacements.incline;
  assert.deepEqual(rows.map(row=>row.stationIn),stationsIn);
  for(const row of rows){
    const expected=analyticAt(row.stationIn);
    for(const field of ['axialIn','transverseIn','rotationRad'])near(row[field],expected[field],`${field} at ${row.stationIn}`);
  }
  const end=analyticAt(L);
  near(out.displacements.tip.uxIn,c*end.axialIn-s*end.transverseIn,'global tip x');
  near(out.displacements.tip.uyIn,s*end.axialIn+c*end.transverseIn,'global tip y');
  assert.equal(out.fabricationAuthorized,false);
});

test('reversing ordered inclined axis complements station, negates local translations, and preserves physical CCW rotation',()=>{
  const reversedStations=stationsIn.map(x=>L-x).reverse();
  const reversed=solve({...model,members:[{...model.members[0],startNodeId:'tip',endNodeId:'fixed'}]},reversedStations);
  const rows=reversed.memberSectionDisplacements.incline;
  assert.deepEqual(rows.map(row=>row.stationIn),reversedStations);
  for(const row of rows){
    const original=analyticAt(L-row.stationIn);
    near(row.axialIn,-original.axialIn,`reversed axial at ${row.stationIn}`);
    near(row.transverseIn,-original.transverseIn,`reversed transverse at ${row.stationIn}`);
    near(row.rotationRad,original.rotationRad,`retained CCW rotation at ${row.stationIn}`);
  }
});
