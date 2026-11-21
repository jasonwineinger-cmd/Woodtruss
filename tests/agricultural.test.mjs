import test from 'node:test';
import assert from 'node:assert/strict';
import {generateAgriculturalOutline} from '../dist/geometry/src/agricultural.js';
test('agricultural planning outline respects 50-foot limit',()=>{
 const a=generateAgriculturalOutline({family:'agricultural',spanFt:50,pitchRisePer12:4,overhangIn:12});
 assert.equal(a.spanIn,600);
 assert.equal(a.roofProfile[0].x,-12);
 assert.equal(a.status,'GEOMETRY_ONLY_NOT_ENGINEERED');
 assert.throws(()=>generateAgriculturalOutline({family:'agricultural',spanFt:51,pitchRisePer12:4}));
});
