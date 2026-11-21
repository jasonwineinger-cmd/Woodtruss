import test from 'node:test';
import assert from 'node:assert/strict';
import {generateCommonTopology} from '../dist/geometry/src/topology.js';
test('common topology has deterministic unique joints and members',()=>{
 const t=generateCommonTopology({family:'common',spanFt:40,pitchRisePer12:4});
 assert.equal(t.joints.length,8); assert.equal(t.members.length,13);
 assert.equal(new Set(t.joints.map(j=>j.id)).size,t.joints.length);
 const ids=new Set(t.joints.map(j=>j.id));
 for(const m of t.members){assert.ok(ids.has(m.start)&&ids.has(m.end));assert.notEqual(m.start,m.end)}
 assert.equal(t.status,'GEOMETRY_ONLY_NOT_ENGINEERED');
});
test('symmetry of common top chord',()=>{
 const t=generateCommonTopology({family:'common',spanFt:30,pitchRisePer12:6});
 const get=id=>t.joints.find(j=>j.id===id).position;
 assert.equal(get('Q1').y,get('Q3').y);
 assert.equal(get('R').x,180);
});
test('reject unsupported topologies',()=>{
 assert.throws(()=>generateCommonTopology({family:'scissor',spanFt:30,pitchRisePer12:4}));
 assert.throws(()=>generateCommonTopology({family:'common',spanFt:30,pitchRisePer12:4,overhangIn:12}));
});
