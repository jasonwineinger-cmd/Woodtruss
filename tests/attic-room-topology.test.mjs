import assert from 'node:assert/strict';
import test from 'node:test';
import {generateAtticRoomTopology} from '../dist/geometry/src/attic-topology.js';

const base={family:'attic',spanFt:40,pitchRisePer12:8,roomWidthFt:12,requiredClearHeightFt:7};

test('attic schematic connects physical nodes around an untouched protected room',()=>{
  const t=generateAtticRoomTopology({...base,sideClearanceIn:6,headClearanceIn:8});
  assert.equal(t.status,'GEOMETRY_ONLY_NOT_ENGINEERED');
  assert.equal(t.pinJointAnalysisAvailable,false);
  assert.equal(t.fabricationAuthorized,false);
  assert.deepEqual(t.protectedRoomOutlineIn,[{x:168,y:0},{x:312,y:0},{x:312,y:84},{x:168,y:84}]);
  assert.deepEqual(t.jambStationsIn,[162,318]);
  assert.equal(t.tieCenterlineHeightIn,108);
  const nodes=new Map(t.joints.map(j=>[j.id,j.position]));
  assert.equal(nodes.size,7);
  assert.deepEqual(nodes.get(t.bearings.right),{x:480,y:0});
  const edges = new Set();
  const adjacent=new Map([...nodes.keys()].map(id=>[id,[]]));
  for(const {start,end} of t.members){
    assert.ok(nodes.has(start)&&nodes.has(end));
    const a=nodes.get(start),b=nodes.get(end);
    assert.notDeepEqual(a,b);
    const key=[start,end].sort().join(':');
    assert.ok(!edges.has(key));
    edges.add(key);
    adjacent.get(start).push(end);
    adjacent.get(end).push(start);
    // Entire member stays to one side, on the room floor, or above the room.
    assert.ok(Math.max(a.x,b.x)<=168 || Math.min(a.x,b.x)>=312 ||
      Math.max(a.y,b.y)<=0 || Math.min(a.y,b.y)>=84, key);
  }
  const visited=new Set(['L']);
  for(const id of visited)for(const next of adjacent.get(id))visited.add(next);
  assert.equal(visited.size,nodes.size);
  assert.equal(edges.size,10);
  assert.ok(edges.size<2*nodes.size-3); // pins + roller alone cannot stabilize this graph
});

test('attic topology enforces scope, full clearance and the 50-ft cap',()=>{
  assert.equal(generateAtticRoomTopology({...base,spanFt:50}).joints.find(j=>j.id==='E').position.x,600);
  for(const bad of [
    {spanFt:50.001},{spanFt:51},{heelHeightIn:2},{overhangIn:2},{floorElevationIn:2},
    {bottomPitchRisePer12:1},{sideClearanceIn:-1},{headClearanceIn:Infinity},
    {sideClearanceIn:168},{headClearanceIn:29},{requiredClearHeightFt:10},
  ])assert.throws(()=>generateAtticRoomTopology({...base,...bad}));
});
