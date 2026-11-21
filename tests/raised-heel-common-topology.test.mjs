import assert from 'node:assert/strict';
import test from 'node:test';
import { generateRaisedHeelCommonTopology as generate } from '../dist/geometry/src/raised-heel-common-topology.js';

const base={family:'common',spanFt:32,pitchRisePer12:6,heelHeightIn:12};

test('distinct raised top heels keep the level bearing stations and complete separate end triangles',()=>{
  const g=generate(base);
  assert.equal(g.status,'GEOMETRY_ONLY_NOT_ENGINEERED');
  assert.equal(g.pinJointAnalysisAvailable,false);
  assert.equal(g.fabricationAuthorized,false);
  const joints=new Map(g.joints.map(j=>[j.id,j.position]));
  assert.equal(joints.size,10);
  assert.deepEqual(g.bearings,{left:'L',right:'E'});
  assert.deepEqual(g.topHeels,{left:'HL',right:'HE'});
  assert.deepEqual(joints.get('L'),{x:0,y:0});
  assert.deepEqual(joints.get('E'),{x:384,y:0});
  assert.deepEqual(joints.get('HL'),{x:0,y:12});
  assert.deepEqual(joints.get('HE'),{x:384,y:12});
  assert.deepEqual(joints.get('R'),{x:192,y:108});
  for(const id of ['HL','Q1','R','Q3','HE']){
    const {x,y}=joints.get(id);
    assert.equal(y,12+Math.min(x,384-x)/2);
  }
  const key=(a,b)=>[a,b].sort().join(':');
  const edges=new Set(g.members.map(({start,end})=>{
    assert.ok(joints.has(start)&&joints.has(end));
    assert.notDeepEqual(joints.get(start),joints.get(end));
    return key(start,end);
  }));
  assert.equal(edges.size,17);
  assert.equal(g.members.length,17);
  for(const [a,b,c] of [['L','HL','B1'],['HL','Q1','B1'],['B3','Q3','HE'],['B3','HE','E']]){
    for(const [u,v] of [[a,b],[b,c],[c,a]])assert.ok(edges.has(key(u,v)));
  }
});

test('validates exact 50-ft limit and rejects unmodeled or degenerate inputs',()=>{
  const limit=generate({...base,spanFt:50,heelHeightIn:48});
  assert.deepEqual(limit.joints.find(j=>j.id==='HE').position,{x:600,y:48});
  for(const bad of [
    {spanFt:50.001},{spanFt:51},{spanFt:Infinity},{heelHeightIn:0},{heelHeightIn:48.001},
    {overhangIn:1},{bottomPitchRisePer12:1},{pitchRisePer12:Number.MIN_VALUE},{family:'scissor'},
  ])assert.throws(()=>generate({...base,...bad}));
});
