import test from 'node:test';
import assert from 'node:assert/strict';
import {generateAtticClearanceEnvelope} from '../dist/geometry/src/attic.js';
const base={family:'attic',spanFt:40,pitchRisePer12:8,roomWidthFt:12,requiredClearHeightFt:7};
test('attic envelope has symmetric room and adequate geometric clearance',()=>{
 const x=generateAtticClearanceEnvelope(base);
 assert.equal(x.roomWidthIn,144);
 assert.equal(x.room[0].x,168);
 assert.equal(x.room[1].x,312);
 assert.ok(x.availableClearHeightIn>=84);
 assert.equal(x.status,'GEOMETRY_ONLY_NOT_ENGINEERED');
});
test('attic clearance and span limits are enforced',()=>{
 assert.throws(()=>generateAtticClearanceEnvelope({...base,requiredClearHeightFt:10}));
 assert.throws(()=>generateAtticClearanceEnvelope({...base,roomWidthFt:40}));
 assert.throws(()=>generateAtticClearanceEnvelope({...base,spanFt:51}));
 assert.throws(()=>generateAtticClearanceEnvelope({...base,overhangIn:12}));
});
