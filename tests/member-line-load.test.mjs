import test from 'node:test';
import assert from 'node:assert/strict';
import {distributeExplicitMemberLineLoad} from '../dist/analysis/src/member-line-load.js';

const model={nodes:[{id:'A',x:11,y:17},{id:'B',x:71,y:97}],
  bars:[{id:'AB',a:'A',b:'B',areaIn2:2,elasticModulusPsi:1e6}]};
const input={memberId:'AB',fromIn:20,toIn:70,from:{fxLbPerIn:-2,fyLbPerIn:3},
  to:{fxLbPerIn:4,fyLbPerIn:-1},provenance:'synthetic authored vector'};
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} ≠ ${expected}`);

test('partial sloped-member load preserves independently integrated signed force and planar moment',()=>{
 const out=distributeExplicitMemberLineLoad(model,input);
 const [a,b]=out.jointLoads;
 assert.equal(out.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(out.provenance,input.provenance);
 assert.equal(a.nodeId,'A');assert.equal(b.nodeId,'B');
 // Signed rectangle + triangular increment in each component, with centers
 // s=45 in and s=20+50*2/3 in. Member direction is (0.6,0.8).
 const fx=[-100,150],fy=[150,-100],positions=[45,20+100/3];
 const moment=positions.reduce((m,s,i)=>m+(11+0.6*s)*fy[i]-(17+0.8*s)*fx[i],0);
 close(a.fxLb+b.fxLb,50);close(a.fyLb+b.fyLb,50);
 close(11*a.fyLb-17*a.fxLb+71*b.fyLb-97*b.fxLb,moment);
 close(b.fxLb,fx.reduce((sum,value,i)=>sum+positions[i]*value/100,0));
 close(b.fyLb,fy.reduce((sum,value,i)=>sum+positions[i]*value/100,0));
});

test('reversing modeled endpoints and signed station definition preserves each node force',()=>{
 const forward=distributeExplicitMemberLineLoad(model,input).jointLoads;
 const reversed=distributeExplicitMemberLineLoad({...model,bars:[{...model.bars[0],a:'B',b:'A'}]},
   {...input,fromIn:30,toIn:80,from:input.to,to:input.from}).jointLoads;
 for(const [i,load] of reversed.entries()){
  assert.equal(load.nodeId,forward[1-i].nodeId);
  close(load.fxLb,forward[1-i].fxLb);close(load.fyLb,forward[1-i].fyLb);
 }
});

test('rejects wrong scope, duplicate member or node, invalid interval and overflow',()=>{
 for(const [edit,error] of [[{memberId:'other'},/exact member/],[{provenance:' '},/provenance/],
  [{fromIn:-1},/interval/],[{toIn:101},/interval/],[{toIn:20},/interval/],
  [{from:{fxLbPerIn:Infinity,fyLbPerIn:0}},/intensity/],
  [{from:{fxLbPerIn:Number.MAX_VALUE,fyLbPerIn:0}},/overflow/]])
   assert.throws(()=>distributeExplicitMemberLineLoad(model,{...input,...edit}),error);
 assert.throws(()=>distributeExplicitMemberLineLoad({...model,bars:[...model.bars,{...model.bars[0],id:'BA',a:'B',b:'A'}]},input),/unique physical bar/);
 assert.throws(()=>distributeExplicitMemberLineLoad({...model,nodes:[...model.nodes,model.nodes[0]]},input),/Invalid modeled member endpoint/);
});
