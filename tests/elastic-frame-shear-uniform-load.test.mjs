import test from 'node:test';
import assert from 'node:assert/strict';
import {elasticFrameShearMemberUniformLoad} from '../dist/analysis/src/elastic-frame-shear-uniform-load.js';

const base={left:{xIn:20,yIn:15},right:{xIn:-40,yIn:95},releaseLeftRotation:false,releaseRightRotation:false,
  basis:'member-length',qxLbPerIn:2.25,qyLbPerIn:-1.4,
  areaIn2:3.5,secondMomentIn4:18,elasticModulusPsi:1_200_000,
  shear:{shearModulusPsi:3_000,effectiveShearAreaIn2:2.4}};
const close=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-9,`${a} vs ${b}`);
const vector=(actual,expected)=>expected.forEach((value,i)=>close(actual[i],value));

test('full-length signed inclined load equals independent shear-flexible displacement-shape quadrature',()=>{
  const L=100,c=-.6,s=.8;
  const phi=12*base.elasticModulusPsi*base.secondMomentIn4/
    (base.shear.shearModulusPsi*base.shear.effectiveShearAreaIn2*L**2);
  const p=1/(1+phi);
  assert.ok(p>.1&&p<.5,'fixture has significant shear flexibility');
  const H=t=>p*(3*t*t-2*t*t*t)+(1-p)*t;
  const R=t=>L*(p*t*(1-t)**2+(1-p)*t*(1-t)/2);
  // Two-point Gauss integrates the cubic fields exactly.
  for(const basis of ['member-length','horizontal-projection']){
    const input={...base,basis};
    const out=elasticFrameShearMemberUniformLoad(input);
    const measure=basis==='member-length'?L:60;
    const axial=(c*base.qxLbPerIn+s*base.qyLbPerIn)*measure;
    const transverse=(-s*base.qxLbPerIn+c*base.qyLbPerIn)*measure;
    const expected=Array(6).fill(0);
    for(const t of [(.5-.5/Math.sqrt(3)),(.5+.5/Math.sqrt(3))]){
      const values=[axial*(1-t),transverse*(1-H(t)),transverse*R(t),axial*t,transverse*H(t),-transverse*R(1-t)];
      values.forEach((x,i)=>expected[i]+=x/2);
    }
    vector(out.localEquivalentLoad,expected);
    const rev=elasticFrameShearMemberUniformLoad({...input,left:base.right,right:base.left});
    const g=out.globalEquivalentLoad;
    vector(rev.globalEquivalentLoad,[...g.slice(3),...g.slice(0,3)]);
    close(out.physicalResultant.momentAboutLeftLbIn,(-30*base.qyLbPerIn-40*base.qxLbPerIn)*measure);
    assert.equal(out.shearDeformationModeled,true);
    assert.equal(out.manufacturingApproved,false);
  }
});

test('missing or invalid shear and unsupported released/partial forms fail closed',()=>{
  for(const altered of [{shear:undefined},{shear:{shearModulusPsi:0,effectiveShearAreaIn2:3}},
    {shear:{...base.shear,extra:1}},{elasticModulusPsi:NaN},{releaseRightRotation:true},
    {loadedFraction:0.5},{basis:'unknown'},{left:{xIn:20,yIn:Infinity}},
    {right:{xIn:20,yIn:100},basis:'horizontal-projection'}])
    assert.throws(()=>elasticFrameShearMemberUniformLoad({...base,...altered}));
});
