import test from 'node:test';
import assert from 'node:assert/strict';
import {elasticFrameShearMemberPointLoad as reduce} from '../dist/analysis/src/elastic-frame-shear-point-load.js';
import {elasticFrameMemberPointLoad as eb} from '../dist/analysis/src/elastic-frame-member-point-load.js';

const base=()=>({
  left:{xIn:0,yIn:0},right:{xIn:12,yIn:0},releaseLeftRotation:false,releaseRightRotation:false,
  stationIn:3,fxLb:8,fyLb:-20,areaIn2:3,secondMomentIn4:12,elasticModulusPsi:1000,
  shear:{shearModulusPsi:250,effectiveShearAreaIn2:2},
});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} ≠ ${b}`);
const vector=(a,b)=>{assert.equal(a.length,b.length); a.forEach((x,i)=>close(x,b[i]));};

test('off-center phi=2 matches analytical shape coefficients and an independent physical moment',()=>{
  const result=reduce(base());
  assert.equal(result.shearFlexibility.phi,2);
  vector(result.localEquivalentLoad,[6,-15.625,-26.25,2,-4.375,18.75]);
  vector(result.globalEquivalentLoad,result.localEquivalentLoad);
  assert.deepEqual(result.physicalResultant,{fxLb:8,fyLb:-20,at:{xIn:3,yIn:0},momentAboutLeftLbIn:-60});
  const [fx1,fy1,m1,fx2,fy2,m2]=result.globalEquivalentLoad;
  vector([fx1+fx2,fy1+fy2,m1+m2+12*fy2],[8,-20,-60]);
  assert.equal(result.manufacturingApproved,false);
});

test('passes virtual work for a homogeneous cubic transverse field with shear offset in the nodal rotations',()=>{
  const result=reduce(base());
  // v(t)=t³. Independent homogeneous solution has section theta=dv/dx+EI/GAs*d³v/dx³,
  // so v(0)=0,v(1)=1, theta(0)=phi/(2L),theta(1)=(3+phi/2)/L.
  const dofs=[0,0,1/12,0,1,4/12];
  const work=result.localEquivalentLoad.reduce((sum,action,i)=>sum+action*dofs[i],0);
  close(work,-20/64);
});

test('reversing a skew member at the complementary station swaps its global DOF triplets and preserves its physical location',()=>{
  const input={...base(),left:{xIn:-3,yIn:7},right:{xIn:4.2,yIn:16.6}};
  const first=reduce(input), reversed=reduce({...input,left:input.right,right:input.left,stationIn:first.lengthIn-input.stationIn});
  vector(reversed.globalEquivalentLoad,[...first.globalEquivalentLoad.slice(3),...first.globalEquivalentLoad.slice(0,3)]);
  close(reversed.physicalResultant.at.xIn,first.physicalResultant.at.xIn);
  close(reversed.physicalResultant.at.yIn,first.physicalResultant.at.yIn);
});

test('stiff-shear limit recovers EB point shapes and rejects unsupported or unusable inputs',()=>{
  const input=base();
  const {areaIn2:_,secondMomentIn4:__,elasticModulusPsi:___,shear,...point}=input;
  vector(reduce({...input,shear:{...shear,shearModulusPsi:1e300}}).globalEquivalentLoad,eb(point).globalEquivalentLoad);
  assert.throws(()=>reduce({...input,shear:{...shear,assumed:true}}),/Exact explicit shear/);
  assert.throws(()=>reduce({...input,shear:{...shear,shearModulusPsi:0}}),/finite positive/);
  assert.throws(()=>reduce({...input,releaseRightRotation:true}),/unreleased/);
  assert.throws(()=>reduce({...input,stationIn:12}),/Strict interior/);
  assert.throws(()=>reduce({...input,stationIn:Number.MIN_VALUE}),/usable numerical range/);
  assert.throws(()=>reduce({...input,coupleLbIn:1}),/Unknown or missing/);
});
