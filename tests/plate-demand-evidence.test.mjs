import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzePinJointedTruss } from '../dist/analysis/src/index.js';
import { inventoryScenarioConnectorPlateDemands } from '../dist/connections/src/plate-screen.js';

const joints=[{id:'A',x:0,y:0},{id:'B',x:3,y:4},{id:'C',x:3,y:0}];
const members=[{id:'AB',start:'A',end:'B'}, {id:'AC',start:'A',end:'C'}];
const cases=[
 {id:'down',axialForceLb:{AB:-100,AC:20}},
 {id:'up',axialForceLb:{AB:40,AC:-150}},
];
test('signed coincident plate demands preserve source cases and opposite joint-end projections',()=>{
 const [a,b,c]=inventoryScenarioConnectorPlateDemands(joints,members,[],cases);
 const force=(memberId,axialLb,memberOnJointFxLb,memberOnJointFyLb)=>
   ({memberId,axialLb,memberOnJointFxLb,memberOnJointFyLb});
 // 3-4-5 diagonal, positive tension pulls the end joint toward the other end.
 assert.deepEqual(a.scenarios,[
  {scenarioId:'down',members:[force('AB',-100,-60,-80),force('AC',20,20,0)]},
  {scenarioId:'up',members:[force('AB',40,24,32),force('AC',-150,-150,0)]},
 ]);
 assert.deepEqual(b.scenarios[0].members,[force('AB',-100,60,80)]);
 assert.deepEqual(c.scenarios[1].members,[force('AC',-150,150,0)]);
 for(const demand of [a,b,c]){
  assert.equal(demand.status,'UNVERIFIED_CONNECTION');
  assert.equal(demand.fabricationAuthorized,false);
  assert.ok(demand.missingChecks.some(check=>check.includes('capacities')));
  assert.equal('governingPlateForceLb' in demand,false);
 }
});

test('rejects incomplete, foreign, nonfinite and duplicate case data rather than filling gaps',()=>{
 const run=(input,sourceJoints=joints)=>inventoryScenarioConnectorPlateDemands(sourceJoints,members,[],input);
 assert.throws(()=>run([]),/signed scenarios/);
 assert.throws(()=>run([cases[0],cases[0]]),/Duplicate/);
 for(const axialForceLb of [{AB:0},{AB:0,X:3},{AB:0,AC:1,X:2},{AB:0,AC:NaN},
  Object.assign(Object.create({AC:1}),{AB:1,X:2})]){
  assert.throws(()=>run([{id:'partial',axialForceLb}]),/signed axial coverage/);
 }
 assert.throws(()=>run(cases,[joints[0],{id:'B',x:0,y:0},joints[2]]),/member length/);
 assert.throws(()=>run(cases,[joints[0],{id:'B',x:Infinity,y:0},joints[2]]),/joint coordinates/);
});

test('agrees with hand equilibrium for solved symmetric apex load reversals',()=>{
 const nodes=[{id:'A',x:0,y:0},{id:'B',x:120,y:120},{id:'C',x:240,y:0}];
 const ends=[{id:'AB',start:'A',end:'B'},{id:'BC',start:'B',end:'C'},{id:'AC',start:'A',end:'C'}];
 const model={
  nodes,bars:ends.map(({id,start:a,end:b})=>({id,a,b,areaIn2:2,elasticModulusPsi:1e6})),
  supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}],
 };
 const signed=[['down',-1000],['up',400]].map(([id,fyLb])=>({
  id,axialForceLb:analyzePinJointedTruss({...model,loads:[{nodeId:'B',fyLb}]}).axialForceLb,
 }));
 const [heel,apex]=inventoryScenarioConnectorPlateDemands(nodes,ends,[],signed);
 const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
 for(const [i,halfLoad] of [500,-200].entries()){
  const [left,right]=apex.scenarios[i].members;
  near(left.axialLb,-halfLoad*Math.SQRT2);
  near(right.axialLb,-halfLoad*Math.SQRT2);
  near(left.memberOnJointFyLb,halfLoad);
  near(right.memberOnJointFyLb,halfLoad);
  near(left.memberOnJointFxLb,halfLoad);
  near(right.memberOnJointFxLb,-halfLoad);
  near(heel.scenarios[i].members.find(row=>row.memberId==='AC').axialLb,halfLoad);
 }
});
