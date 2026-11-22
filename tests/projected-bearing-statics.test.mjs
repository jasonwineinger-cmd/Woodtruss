import assert from 'node:assert/strict';
import test from 'node:test';
import {calculateProjectedBearingStatics as check} from '../dist/analysis/src/projected-bearing-statics.js';

const strip=(id,fromFt,toFt,fyPsf)=>({id,source:'Synthetic projection '+id,fromFt,toFt,fyPsf});
const input={spanFt:24,tributaryWidthFt:3,strips:[strip('uniform',0,24,-10),strip('left-up',0,6,20)]};

test('direct force and moment reproduce synthetic asymmetric reactions and preserve signed strips',()=>{
 const r=check(input);
 // −720 lb at x=12; +360 lb at x=3. About left: −8,640 + 1,080.
 assert.equal(r.appliedForceYLb,-360);
 assert.equal(r.appliedMomentAboutLeftLbFt,-7560);
 assert.equal(r.rightReactionYLb,315);
 assert.equal(r.leftReactionYLb,45);
 assert.deepEqual(r.contributions.map(s=>[s.centerFt,s.forceYLb]),[[12,-720],[3,360]]);
 assert.equal(r.fabricationAuthorized,false);
});

test('zero force does not erase signed reaction couple; exact span limit remains enforced',()=>{
 const r=check({spanFt:50,tributaryWidthFt:2,strips:[strip('down',0,5,-8),strip('up',45,50,8)]});
 assert.equal(r.appliedForceYLb,0);
 assert.equal(r.appliedMomentAboutLeftLbFt,3600);
 assert.equal(r.rightReactionYLb,-72);
 assert.equal(r.leftReactionYLb,72);
 for(const bad of [
   {...input,spanFt:50.001},{...input,tributaryWidthFt:0},{...input,strips:[]},
   {...input,strips:[strip('bad',0,24.0001,-1)]},
   {...input,strips:[input.strips[0],input.strips[0]]},
   {...input,strips:new Array(1)},
   {...input,strips:[strip('bad',0,24,Number.MAX_VALUE)]},
 ]) assert.throws(()=>check(bad));
});
