import test from 'node:test';
import assert from 'node:assert/strict';
import {makeExplicitLoadCase} from '../dist/analysis/src/cases.js';
const base={nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:0}],bars:[{id:'AB',a:'A',b:'B',areaIn2:1,elasticModulusPsi:1e6}],supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'B',fixX:false,fixY:true}],loads:[]};
test('load cases copy geometry and accept signed vertical uplift loads',()=>{
 const m=makeExplicitLoadCase(base,{id:'up',description:'illustrative uplift',jointLoads:[{nodeId:'B',fyLb:100}]});
 assert.equal(m.loads[0].fyLb,100);
 assert.notEqual(m.nodes,base.nodes);
 assert.notEqual(m.bars,base.bars);
 assert.deepEqual(base.loads,[]);
});
test('invalid loads and missing metadata rejected',()=>{
 assert.throws(()=>makeExplicitLoadCase(base,{id:'',description:'x',jointLoads:[]}));
 assert.throws(()=>makeExplicitLoadCase(base,{id:'x',description:'x',jointLoads:[{nodeId:'Z',fyLb:1}]}));
 assert.throws(()=>makeExplicitLoadCase(base,{id:'x',description:'x',jointLoads:[{nodeId:'B',fyLb:NaN}]}));
});
