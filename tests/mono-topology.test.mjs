import assert from 'node:assert/strict';
import test from 'node:test';
import {generateMonoTopology} from '../dist/geometry/src/mono.js';

const base = {family:'mono',spanFt:30,pitchRisePer12:6};
const edgeKey = (a,b) => [a,b].sort().join(':');

test('mono topology has flat bearing chord, single-slope top and seven triangular panels', () => {
  const r = generateMonoTopology(base);
  assert.equal(r.status,'GEOMETRY_ONLY_NOT_ENGINEERED');
  assert.equal(r.family,'mono');
  assert.deepEqual(r.bearings,{left:'L',right:'E'});
  const nodes = new Map(r.joints.map(({id,position}) => [id,position]));
  assert.equal(nodes.size,r.joints.length);
  assert.equal(nodes.size,9);
  assert.deepEqual(nodes.get('L'),{x:0,y:0});
  assert.deepEqual(nodes.get('E'),{x:360,y:0});
  for (let i=1;i<=4;i++) {
    assert.deepEqual(nodes.get(`T${i}`),{x:i*90,y:i*45});
    if (i<4) assert.deepEqual(nodes.get(`B${i}`),{x:i*90,y:0});
  }

  const edges = new Set();
  for (const {start,end} of r.members) {
    assert.ok(nodes.has(start) && nodes.has(end));
    assert.notDeepEqual(nodes.get(start),nodes.get(end));
    const key=edgeKey(start,end);
    assert.ok(!edges.has(key), `Duplicate edge ${key}`);
    edges.add(key);
  }
  assert.equal(edges.size,15);
  assert.equal(new Set(r.members.map(member=>member.id)).size,r.members.length);
  const triangles = [['L','T1','B1']];
  for(let i=2;i<=4;i++){
    const lower=i===4?'E':`B${i}`;
    triangles.push([`T${i-1}`,`B${i-1}`,lower], [`T${i-1}`,lower,`T${i}`]);
  }
  const covered=new Set();
  for(const [a,b,c] of triangles){
    const p=nodes.get(a),q=nodes.get(b),s=nodes.get(c);
    assert.notEqual((q.x-p.x)*(s.y-p.y)-(q.y-p.y)*(s.x-p.x),0);
    for(const edge of [edgeKey(a,b),edgeKey(b,c),edgeKey(c,a)]){
      assert.ok(edges.has(edge),`Missing edge ${edge}`);
      covered.add(edge);
    }
  }
  assert.deepEqual(covered,edges);
});

test('mono options enforce 50-foot cap and reject unsupported geometry rather than approximate it', () => {
  for (const spanFt of [8,50]) {
    const r = generateMonoTopology({...base,spanFt,pitchRisePer12:18});
    assert.equal(r.joints.find(({id})=>id==='E').position.x,spanFt*12);
  }
  for(const spanFt of [7.999,50.001,51,NaN,Infinity]){
    assert.throws(()=>generateMonoTopology({...base,spanFt}),/between 8 and 50/);
  }
  for(const pitchRisePer12 of [0,18.001,NaN,Infinity]){
    assert.throws(()=>generateMonoTopology({...base,pitchRisePer12}),/Pitch/);
  }
  assert.throws(()=>generateMonoTopology({...base,heelHeightIn:1}),/Raised-heel/);
  assert.throws(()=>generateMonoTopology({...base,overhangIn:1}),/overhang/);
  assert.throws(()=>generateMonoTopology({...base,bottomPitchRisePer12:2}),/flat bottom/);
  assert.throws(()=>generateMonoTopology({...base,family:'common'}),/mono family/);
});
