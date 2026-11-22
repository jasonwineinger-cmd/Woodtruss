import test from 'node:test';
import assert from 'node:assert/strict';
import {elasticFrameDeflectionBranches} from '../dist/analysis/src/elastic-frame-deflection-branches.js';

const L=80, cut=23, q=-2.5, p=75;
const E=1_200_000, I=17, A=3;
const EI=E*I, shear={shearModulusPsi:70_000,effectiveShearAreaIn2:2.1};
const GA=shear.shearModulusPsi*shear.effectiveShearAreaIn2;
const thetaL=.0015, vL=-.017;
const near=(actual,expected)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<1e-12,`${actual} vs ${expected}`);
const polynomial=([c0,c1,c2,c3],t)=>((c3*t+c2)*t+c1)*t+c0;

function make(point,shearModel) {
  const force=point?p:0;
  const VL=-q*L-force, ML=-(q*L*L/2+force*cut);
  const rigidity=shearModel?GA:Infinity;
  // Independent direct integration of remaining loads on right cut:
  // M(x)=q(L-x)^2/2+P*max(a-x,0), V(x)=q(L-x)+P I[x<a].
  const theta=x=>{
    const z=Math.min(x,cut);
    return thetaL+(q*(L**3-(L-x)**3)/6+force*(cut*z-z*z/2))/EI;
  };
  const thetaR=theta(L);
  const vR=vL+thetaL*L+(q*L**4/8+force*(L*cut**2/2-cut**3/6))/EI+
    (q*L*L/2+force*cut)/rigidity;
  return {input:{lengthIn:L,localEndActions:[0,VL,ML,0,0,0],localDisplacements:[0,vL,thetaL,0,vR,thetaR],
    elasticModulusPsi:E,secondMomentIn4:I,areaIn2:A,shear:shearModel,uniform:{qxLbPerIn:0,qyLbPerIn:q},point},
  theta,rigidity,force};
}

test('normalized slopes follow remaining force and curvature, preserving both sides of a shear jump',()=>{
  const {input,theta,rigidity}=make({stationIn:cut,fxLb:0,fyLb:p},shear);
  const branches=elasticFrameDeflectionBranches(input);
  assert.deepEqual(branches.map(b=>[b.startStationIn,b.endStationIn]),[[0,cut],[cut,L]]);
  branches.forEach((branch,i)=>{
    for(const t of [0,.17,.73,1]){
      const x=branch.startStationIn+t*(branch.endStationIn-branch.startStationIn);
      const V=q*(L-x)+(i===0?p:0);
      near(polynomial(branch.slopeCoefficients,t),theta(x)+V/rigidity);
    }
  });
  near(polynomial(branches[1].slopeCoefficients,0)-polynomial(branches[0].slopeCoefficients,1),-p/GA);
});

test('without a point there is one exact interval; inconsistent end states fail closed',()=>{
  const {input,theta}=make(null,null);
  const [branch]=elasticFrameDeflectionBranches(input);
  assert.equal(elasticFrameDeflectionBranches(input).length,1);
  assert.deepEqual([branch.startStationIn,branch.endStationIn],[0,L]);
  for(const t of [0,.31,1])near(polynomial(branch.slopeCoefficients,t),theta(t*L));
  const wrong=[...input.localDisplacements]; wrong[5]+=.01;
  assert.throws(()=>elasticFrameDeflectionBranches({...input,localDisplacements:wrong}),/does not close/);
  assert.throws(()=>elasticFrameDeflectionBranches({...input,point:{stationIn:L,fxLb:0,fyLb:1}}));
  assert.throws(()=>elasticFrameDeflectionBranches({...input,shear:{...shear,shearModulusPsi:Infinity}}));
});
