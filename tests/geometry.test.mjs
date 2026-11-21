import test from 'node:test';
import assert from 'node:assert/strict';
import {generateRoofOutline} from '../dist/geometry/src/index.js';
test('common truss ridge at midpoint',()=>{const t=generateRoofOutline({family:'common',spanFt:40,pitchRisePer12:6});assert.equal(t.topChord[1].x,240);assert.equal(t.topChord[1].y,120);assert.equal(t.status,'GEOMETRY_ONLY_NOT_ENGINEERED')});
test('mono slope and overhang',()=>{const t=generateRoofOutline({family:'mono',spanFt:20,pitchRisePer12:3,overhangIn:12});assert.equal(t.topChord[0].x,-12);assert.equal(t.topChord[1].x,252)});
test('reject invalid span',()=>assert.throws(()=>generateRoofOutline({family:'common',spanFt:51,pitchRisePer12:4})));
test('reject NaN',()=>assert.throws(()=>generateRoofOutline({family:'common',spanFt:NaN,pitchRisePer12:4})));
