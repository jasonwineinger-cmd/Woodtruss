import test from 'node:test';
import assert from 'node:assert/strict';
import {generateRoofOutline} from '../dist/geometry/src/index.js';

test('scissor outline has separate pitched bottom chord',()=>{
 const x=generateRoofOutline({family:'scissor',spanFt:40,pitchRisePer12:6,bottomPitchRisePer12:3});
 assert.deepEqual(x.topChord,[{x:0,y:0},{x:240,y:120},{x:480,y:0}]);
 assert.deepEqual(x.bottomChord,[{x:0,y:0},{x:240,y:60},{x:480,y:0}]);
 assert.equal(x.status,'GEOMETRY_ONLY_NOT_ENGINEERED');
});
test('scissor ceiling slope must be less than roof slope',()=>{
 const base={family:'scissor',spanFt:40,pitchRisePer12:6};
 assert.throws(()=>generateRoofOutline(base));
 assert.throws(()=>generateRoofOutline({...base,bottomPitchRisePer12:6}));
 assert.throws(()=>generateRoofOutline({...base,bottomPitchRisePer12:7}));
 assert.throws(()=>generateRoofOutline({...base,bottomPitchRisePer12:0}));
});
test('scissor heel and overhang remain explicitly unsupported',()=>{
 const base={family:'scissor',spanFt:40,pitchRisePer12:6,bottomPitchRisePer12:3};
 assert.throws(()=>generateRoofOutline({...base,heelHeightIn:12}));
 assert.throws(()=>generateRoofOutline({...base,overhangIn:12}));
});
