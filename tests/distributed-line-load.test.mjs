import test from 'node:test';
import assert from 'node:assert/strict';
import {distributeExplicitLineLoad} from '../dist/analysis/src/distributed-line-load.js';

const model={nodes:[{id:'a',x:20,y:2},{id:'b',x:120,y:78},{id:'c',x:220,y:4}],
 bars:[{id:'ab',a:'a',b:'b',areaIn2:2,elasticModulusPsi:1e6},
       {id:'cb',a:'c',b:'b',areaIn2:2,elasticModulusPsi:1e6}]};
const input={orderedChordNodeIds:['a','b'],fromXIn:20,toXIn:120,fromFyLbPerIn:0,toFyLbPerIn:-12,provenance:'authored load sketch'};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} differs from ${b}`);
const force=(result)=>result.jointLoads.map(row=>row.fyLb);

test('full triangular loading produces independently known reactions from centroid and resultant',()=>{
 const result=distributeExplicitLineLoad(model,input);
 const [left,right]=force(result);
 close(left,-200);
 close(right,-400);
 assert.equal(result.provenance,input.provenance);
 assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
});

test('partial signed load crosses two partial panels and preserves force and moment',()=>{
 const result=distributeExplicitLineLoad(model,{...input,orderedChordNodeIds:['a','b','c'],
   fromXIn:70,toXIn:170,fromFyLbPerIn:-6,toFyLbPerIn:6});
 const [a,b,c]=force(result);
 // Two triangles act at X=70+50/3 and 170-50/3, respectively.
 const negative=-150,positive=150;
 close(a,negative*(120-(70+50/3))/100);
 close(c,positive*((170-50/3)-120)/100);
 close(b,0);
 close(a+b+c,0);
 close(a*20+b*120+c*220,negative*(70+50/3)+positive*(170-50/3));
});

test('partial uniform load resolves by centroid in its panel and leaves other nodes unloaded',()=>{
 const result=distributeExplicitLineLoad(model,{...input,orderedChordNodeIds:['a','b','c'],
    fromXIn:130,toXIn:150,fromFyLbPerIn:2,toFyLbPerIn:2});
 const [a,b,c]=force(result);
 close(a,0);close(b,32);close(c,8);
});

test('rejects malformed nodes, invalid intervals and intensity, absent provenance, and overflow',()=>{
 for(const [edit,error] of [
   [{orderedChordNodeIds:['a','a']},/Unique/],
   [{orderedChordNodeIds:['a','unknown']},/Unknown/],
   [{orderedChordNodeIds:['b','a']},/strictly/],
   [{fromXIn:19},/interval/],
   [{toXIn:20},/interval/],
   [{toXIn:121},/interval/],
   [{fromFyLbPerIn:Infinity},/intensity/],
   [{provenance:' '},/provenance/],
   [{fromFyLbPerIn:Number.MAX_VALUE,toFyLbPerIn:Number.MAX_VALUE},/overflow/],
 ])assert.throws(()=>distributeExplicitLineLoad(model,{...input,...edit}),error);
 assert.throws(()=>distributeExplicitLineLoad({...model,nodes:[...model.nodes,model.nodes[0]]},input),/Duplicate model node/);
});


test('rejects a missing, skipped or duplicate physical chord bar',()=>{
 const complaint=/exactly one existing bar/;
 assert.throws(()=>distributeExplicitLineLoad({...model,bars:model.bars.slice(1)},input),complaint);
 assert.throws(()=>distributeExplicitLineLoad(model,{...input,orderedChordNodeIds:['a','c']}),complaint);
 assert.throws(()=>distributeExplicitLineLoad({...model,bars:[...model.bars,
   {...model.bars[0],id:'ba',a:'b',b:'a'}]},input),complaint);
});
