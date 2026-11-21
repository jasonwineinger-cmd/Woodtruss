import assert from 'node:assert/strict';
import test from 'node:test';
import {generateAsymmetricCommonTopology as generate} from '../dist/geometry/src/asymmetric-common-topology.js';

const base={spanFt:30,leftPitchRisePer12:4,rightPitchRisePer12:8};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('offset ridge independently satisfies both slopes with unchanged level bearings',()=>{
  const result=generate(base);
  assert.equal(result.pinJointAnalysisAvailable,false);
  assert.equal(result.fabricationAuthorized,false);
  assert.equal(result.status,'GEOMETRY_ONLY_NOT_ENGINEERED');
  assert.deepEqual(result.ridge,{x:240,y:80}); // 240*(4/12)=(360-240)*(8/12)
  const joints=new Map(result.joints.map(({id,position})=>[id,position]));
  assert.equal(joints.size,8);
  assert.deepEqual(joints.get(result.bearings.left),{x:0,y:0});
  assert.deepEqual(joints.get(result.bearings.right),{x:360,y:0});
  assert.deepEqual(joints.get('Q1'),{x:120,y:40});
  assert.deepEqual(joints.get('Q3'),{x:300,y:40});
  for(const id of ['Q1','R','Q3']){
    const {x,y}=joints.get(id);
    near(y,Math.min(x/3,2*(360-x)/3));
  }
  const unique=new Set(result.members.map(({start,end})=>{
    assert.ok(joints.has(start)&&joints.has(end));
    assert.notDeepEqual(joints.get(start),joints.get(end));
    return [start,end].sort().join(':');
  }));
  assert.equal(unique.size,13);
  assert.equal(result.members.length,13);
  const swapped=generate({...base,leftPitchRisePer12:8,rightPitchRisePer12:4});
  assert.deepEqual(swapped.ridge,{x:120,y:80});
  assert.deepEqual(generate({...base,rightPitchRisePer12:4}).ridge,{x:180,y:60});
});

test('checks hard span limit and rejects unsupported offsets, pitches and collapsed graph',()=>{
  assert.equal(generate({...base,spanFt:50}).joints.find(j=>j.id==='E').position.x,600);
  for (const bad of [
    {spanFt:50.001},{spanFt:7},{spanFt:Infinity},{leftPitchRisePer12:0},
    {rightPitchRisePer12:18.001},{rightPitchRisePer12:Number.MIN_VALUE},
    {rightPitchRisePer12:NaN},{heelHeightIn:1},{overhangIn:1},
  ]) assert.throws(()=>generate({...base,...bad}));
});
