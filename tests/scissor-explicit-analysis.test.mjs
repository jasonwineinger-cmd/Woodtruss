import assert from 'node:assert/strict';
import test from 'node:test';
import {analyzePreliminaryScissorExplicit as analyze} from '../dist/analysis/src/scissor-explicit-analysis.js';

const input={
  roof:{family:'scissor',spanFt:40,pitchRisePer12:6,bottomPitchRisePer12:3},
  areaIn2:5.25,elasticModulusPsi:1_000_000,
  loadCase:{id:'illustrative-signed',description:'Off-center forces and horizontal ceiling-joint load',
    jointLoads:[{nodeId:'Q1',fyLb:-800},{nodeId:'Q3',fyLb:200},{nodeId:'B2',fxLb:120}]},
};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('signed explicit scissor loads balance against independently known chord height and moments',()=>{
 const a=analyze(input);
 assert.equal(a.fabricationAuthorized,false);
 assert.equal(a.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(a.model.bars.length,13);
 assert.deepEqual(a.model.nodes.find(n=>n.id==='B2'),{id:'B2',x:240,y:60});
 assert.deepEqual(a.model.supports,[{nodeId:'L',fixX:true,fixY:true},{nodeId:'E',fixX:false,fixY:true}]);
 // Independently: moment about L is 800(120)-200(360)+120(60).
 const r=(800*120-200*360+120*60)/480;
 near(a.result.reactionLb.E.y,r);
 near(a.result.reactionLb.L.y,600-r);
 near(a.result.reactionLb.L.x,-120);
 near(a.result.reactionLb.E.x,0);
 assert.ok(a.equilibrium.global.passes&&a.equilibrium.joints.passes);
 assert.equal(a.equilibrium.joints.joints.length,8);
 assert.ok(Object.values(a.result.axialForceLb).every(Number.isFinite));
});

test('reject unsupported geometry and invalid loads or properties, including spans over 50 feet',()=>{
 const solve=(roof)=>analyze({...input,roof:{...input.roof,...roof}});
 assert.equal(solve({spanFt:50}).model.nodes.find(n=>n.id==='E').x,600);
 for(const invalid of [
   {spanFt:50.001},{spanFt:51},{family:'attic'},{heelHeightIn:1},{overhangIn:1},
   {bottomPitchRisePer12:0},{bottomPitchRisePer12:6},
 ])assert.throws(()=>solve(invalid));
 for(const invalid of [{nodeId:'bad-joint',fyLb:1},{nodeId:'R',fxLb:Infinity}])
   assert.throws(()=>analyze({...input,loadCase:{...input.loadCase,jointLoads:[invalid]}}),/explicit joint load/);
 assert.throws(()=>analyze({...input,areaIn2:NaN}),/positive finite/);
});
