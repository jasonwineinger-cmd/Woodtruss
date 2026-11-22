import test from 'node:test';
import assert from 'node:assert/strict';
import {benchmarkSymmetricBeamDeflection} from '../dist/analysis/src/symmetric-beam-deflection-benchmark.js';

const specimen={modelId:'synthetic-beam',modelRevision:'R1',provenance:'Independent synthetic statics fixture',
 leftBearingXIn:15,rightBearingXIn:135,forceXIn:75,forceYLb:-600,elasticModulusPsi:1e6,secondMomentIn4:40,
 gages:[{id:'left',xIn:15},{id:'quarter',xIn:45},{id:'midspan',xIn:75},{id:'mirror',xIn:105},{id:'right',xIn:135}]};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('matches independent half-beam double integration, reactions, symmetry and sign',()=>{
 const out=benchmarkSymmetricBeamDeflection(specimen);
 // Left-half moment is (P/2)x. Integrate EI*v''=M with v(0)=0
 // and slope zero at x=60, so v(x)=(300*x^3/6 - 300*60^2*x/2)/EI.
 const hand=(x)=>(300*x**3/6-300*60**2*x/2)/40e6;
 close(out.centerYIn,hand(60));
 close(out.observations[1].deltaYIn,hand(30));
 close(out.observations[3].deltaYIn,hand(30));
 assert.equal(out.observations[0].deltaYIn,0);
 assert.equal(out.observations[4].deltaYIn,0);
 assert.deepEqual(out.bearings,[{xIn:15,reactionYLb:300},{xIn:135,reactionYLb:300}]);
 const uplift=benchmarkSymmetricBeamDeflection({...specimen,forceYLb:600});
 close(uplift.centerYIn,-out.centerYIn);
 assert.equal(uplift.bearings[0].reactionYLb,-300);
 assert.equal(out.physicalMatchVerified,false);
 assert.equal(out.manufacturingApproved,false);
});

test('fails closed for off-center force, invalid model revision, gages and properties',()=>{
 for(const [patch,error] of [[{forceXIn:74.999},/exact centered/],[{modelRevision:''},/revision/],
   [{gages:[{id:'outside',xIn:136}]},/within the bearing/],
   [{gages:[{id:'same',xIn:45},{id:'same',xIn:105}]},/Unique/],
   [{rightBearingXIn:700},/50 ft/],[{secondMomentIn4:0},/properties/],[{forceYLb:Infinity},/properties/]])
  assert.throws(()=>benchmarkSymmetricBeamDeflection({...specimen,...patch}),error);
});
