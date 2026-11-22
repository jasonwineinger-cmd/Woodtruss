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

const uniformRow={memberId:'AB',basis:'member-length',qxLbPerIn:0,qyLbPerIn:-3};
const pointRow={memberId:'AB',stationIn:12,fxLb:0,fyLb:-75};

test('full uniform and strictly interior concentric loads preserve equilibrium and remain preliminary',()=>{
 const uniform={loads:[],memberLoads:[uniformRow]};
 const point={loads:[],memberPointLoads:[pointRow]};
 const EI=section.elasticModulusPsi*section.secondMomentIn4;
 const GA=shear.shearModulusPsi*shear.effectiveShearAreaIn2;
 const a=pointRow.stationIn;
 const checks=[
  {actions:uniform,force:3*span,moment:3*span**2/2,bending:-3*span**4/(8*EI),extra:-3*span**2/(2*GA)},
  {actions:point,force:75,moment:75*a,bending:-75*a**2*(3*span-a)/(6*EI),extra:-75*a/GA},
 ];
 for(const {actions,force,moment,bending,extra} of checks){
  const standard=withMember(member,actions);
  const flexible=withMember({...member,shear},actions);
  near(standard.displacements.B.uyIn,bending);
  near(flexible.displacements.B.uyIn,bending+extra);
  near(flexible.reactions.A.fyLb,force);
  near(flexible.reactions.A.momentLbIn,moment);
  assert.equal(flexible.equilibrium.passes,true);
  assert.equal(flexible.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(flexible.fabricationAuthorized,false);
 }
});

test('declared ideal releases under bounded member loads recover no released moment or manufacturing authority',()=>{
 const released={...member,shear,releaseStartRotation:true,releaseEndRotation:true};
 const supports=[{nodeId:'A',fixX:true,fixY:true,fixRotation:false},
  {nodeId:'B',fixX:false,fixY:true,fixRotation:false}];
 const loads={supports,loads:[],memberLoads:[uniformRow],memberPointLoads:[pointRow]};
 const result=withMember(released,loads);
 const left=3*span/2+75*(span-pointRow.stationIn)/span;
 const right=3*span/2+75*pointRow.stationIn/span;
 near(result.reactions.A.fyLb,left);
 near(result.reactions.B.fyLb,right);
 const actions=result.memberEndActions.AB;
 assert.deepEqual(actions.releasedRotationIndices,[2,5]);
 near(actions.localEndActions[2],0);
 near(actions.localEndActions[5],0);
 assert.equal(result.equilibrium.passes,true);
 assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(result.fabricationAuthorized,false);
 assert.equal(actions.manufacturingApproved,false);
 // A joint moment is not silently assigned to any released section end.
 assert.throws(()=>withMember(released,{...loads,loads:[{nodeId:'B',fxLb:0,fyLb:0,momentLbIn:150}]}),/rotation|moment/iu);
});

test('shear scope still rejects malformed ideal releases, unsupported load shapes and approval fields',()=>{
 const flexible={...member,shear};
 for(const altered of [
  {...flexible,releaseStartRotation:true},
  {...flexible,releaseStartRotation:'true',releaseEndRotation:true},
 ]) assert.throws(()=>withMember(altered),/member|end release/iu);
 for(const row of [{...uniformRow,fromStationIn:2,toStationIn:18},{...uniformRow,basis:'discontinuous'}]){
  assert.throws(()=>withMember(flexible,{memberLoads:[row]}),/member load|line-load basis/iu);
 }
 for(const row of [
  {...pointRow,stationIn:0}, {...pointRow,stationIn:span},
  {...pointRow,eccentricityIn:2}, {...pointRow,momentLbIn:150},
 ]){
  assert.throws(()=>withMember(flexible,{memberPointLoads:[row]}),/point|interior/iu);
 }
 assert.throws(()=>withMember({...member,shear:{...shear,timberShearCapacityPsi:123}}),/shear|field/iu);
 assert.throws(()=>withMember({...flexible,ratedPlateMomentLbIn:123}),/member|field/iu);
 assert.throws(()=>withMember(flexible,{machineReleaseApproved:true}),/frame input field/iu);
});
