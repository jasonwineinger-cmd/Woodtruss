import test from 'node:test';
import assert from 'node:assert/strict';
import {generateScissorTopology} from '../dist/geometry/src/scissor.js';
test('scissor topology produces distinct top and bottom chord joints',()=>{
 const t=generateScissorTopology({family:'scissor',spanFt:40,pitchRisePer12:6,bottomPitchRisePer12:3});
 assert.equal(t.joints.length,8);
 assert.equal(t.members.length,13);
 const j=Object.fromEntries(t.joints.map(j=>[j.id,j.position]));
 assert.equal(j.R.y,120);
 assert.equal(j.B2.y,60);
 assert.equal(j.Q1.y,60);
 assert.equal(j.B1.y,30);
 assert.equal(t.status,'GEOMETRY_ONLY_NOT_ENGINEERED');
});
test('every member joins distinct valid joints',()=>{
 const t=generateScissorTopology({family:'scissor',spanFt:50,pitchRisePer12:8,bottomPitchRisePer12:3});
 const ids=new Set(t.joints.map(j=>j.id));
 for(const m of t.members){assert.ok(ids.has(m.start));assert.ok(ids.has(m.end));assert.notEqual(m.start,m.end);}
});
test('rejects invalid pitch or family',()=>{
 assert.throws(()=>generateScissorTopology({family:'common',spanFt:40,pitchRisePer12:6}));
 assert.throws(()=>generateScissorTopology({family:'scissor',spanFt:40,pitchRisePer12:6,bottomPitchRisePer12:7}));
});
