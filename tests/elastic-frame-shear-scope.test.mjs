import assert from 'node:assert/strict';
import test from 'node:test';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';

const section={areaIn2:4,secondMomentIn4:8,elasticModulusPsi:1e6};
const member={id:'AB',startNodeId:'A',endNodeId:'B',...section};
const shear={shearModulusPsi:60e3,effectiveShearAreaIn2:3};
const span=36, load=250;
const frame={
 nodes:[{id:'A',xIn:0,yIn:0},{id:'B',xIn:span,yIn:0}],
 members:[member],
 supports:[{nodeId:'A',fixX:true,fixY:true,fixRotation:true}],
 loads:[{nodeId:'B',fxLb:0,fyLb:-load,momentLbIn:0}],
};
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
const withMember=(m,actions={})=>solveElasticFrame({...frame,members:[m],...actions});

test('explicit shear flexibility adds cantilever displacement without changing equilibrium or granting release',()=>{
 const standard=withMember(member);
 const flexible=withMember({...member,shear});
 const bending=-load*span**3/(3*section.elasticModulusPsi*section.secondMomentIn4);
 const shearDisplacement=-load*span/(shear.shearModulusPsi*shear.effectiveShearAreaIn2);
 near(standard.displacements.B.uyIn,bending);
 near(flexible.displacements.B.uyIn,bending+shearDisplacement);
 near(flexible.reactions.A.fyLb,load);
 near(flexible.reactions.A.momentLbIn,load*span);
 assert.equal(flexible.equilibrium.passes,true);
 assert.equal(flexible.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(flexible.fabricationAuthorized,false);
});

test('shear scope rejects end release, same-member loads, and timber capacity data without disabling no-shear loads',()=>{
 const uniform={memberLoads:[{memberId:'AB',basis:'member-length',qxLbPerIn:0,qyLbPerIn:-3}]};
 const point={memberPointLoads:[{memberId:'AB',stationIn:12,fxLb:0,fyLb:-75}]};
 near(withMember(member,uniform).reactions.A.fyLb,load+3*span);
 near(withMember(member,point).reactions.A.fyLb,load+75);
 assert.throws(()=>withMember({...member,shear,releaseStartRotation:false,releaseEndRotation:true}),/shear|end release/iu);
 for(const actions of [uniform,point]){
  assert.throws(()=>withMember({...member,shear},actions),/shear/iu);
 }
 assert.throws(()=>withMember({...member,shear:{...shear,timberShearCapacityPsi:123}}),/shear|field/iu);
});
