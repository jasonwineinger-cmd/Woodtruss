import test from 'node:test';
import assert from 'node:assert/strict';
import {distributeExplicitMemberChainLineLoad} from '../dist/analysis/src/member-chain-line-load.js';

const model={nodes:[{id:'A',x:0,y:0},{id:'B',x:60,y:0},{id:'C',x:60,y:80}],
 bars:[{id:'AB',a:'A',b:'B'},{id:'CB',a:'C',b:'B'}]};
const input={orderedNodeIds:['A','B','C'],orderedMemberIds:['AB','CB'],fromIn:30,toIn:100,
 from:{fxLbPerIn:2,fyLbPerIn:-1},to:{fxLbPerIn:2,fyLbPerIn:-1},provenance:'Synthetic authored chain'};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
function totals(loads){
 return loads.reduce(([fx,fy,m],row)=>{
  const {x,y}=model.nodes.find(n=>n.id===row.nodeId);
  return [fx+row.fxLb,fy+row.fyLb,m+x*row.fyLb-y*row.fxLb];
 },[0,0,0]);
}

test('preserves force and global moment across two partial modeled bars, one reverse-stored',()=>{
 const out=distributeExplicitMemberChainLineLoad(model,input);
 assert.deepEqual(out.segments.map(({memberId,chainFromIn,chainToIn})=>[memberId,chainFromIn,chainToIn]),
   [['AB',30,60],['CB',60,100]]);
 // 30-in load at (45,0) and 40-in load at (60,20).
 const [x,y,m]=totals(out.jointLoads);
 close(x,140);close(y,-70);close(m,45*(-30)+60*(-40)-20*80);
 assert.equal(out.status,'PRELIMINARY_NOT_ENGINEERED');
});

test('linearly varying signed load is invariant under reversing cursor direction and swapping endpoint intensities',()=>{
 const signed={...input,to:{fxLbPerIn:-3,fyLbPerIn:4}};
 const reverse={...signed,orderedNodeIds:['C','B','A'],orderedMemberIds:['CB','AB'],
   fromIn:40,toIn:110,from:signed.to,to:signed.from};
 const forward=distributeExplicitMemberChainLineLoad(model,signed);
 const backward=distributeExplicitMemberChainLineLoad(model,reverse);
 for(const [i,row] of forward.jointLoads.entries()){
  assert.equal(row.nodeId,backward.jointLoads[i].nodeId);
  close(row.fxLb,backward.jointLoads[i].fxLb);
  close(row.fyLb,backward.jointLoads[i].fyLb);
 }
 close(totals(forward.jointLoads)[0],-35);
 close(totals(forward.jointLoads)[1],105);
});

test('rejects duplicate, disconnected or ambiguous paths and out-of-scope load bounds',()=>{
 for(const [edit,error] of [[{orderedNodeIds:['A','C','B']},/unique modeled/],
    [{orderedMemberIds:['AB','AB']},/unique nodes/],[{fromIn:-1},/interval/],[{toIn:141},/interval/],
    [{from:{fxLbPerIn:Infinity,fyLbPerIn:0}},/intensity/]])
  assert.throws(()=>distributeExplicitMemberChainLineLoad(model,{...input,...edit}),error);
 assert.throws(()=>distributeExplicitMemberChainLineLoad({...model,bars:[...model.bars,{id:'BA',a:'B',b:'A'}]},input),/unique modeled/);
});
