import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeExplicitScenarios} from '../dist/analysis/src/scenarios.js';
const base={
 nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:120},{id:'C',x:240,y:0}],
 bars:[{id:'AB',a:'A',b:'B',areaIn2:2,elasticModulusPsi:1e6},
 {id:'BC',a:'B',b:'C',areaIn2:2,elasticModulusPsi:1e6},
 {id:'AC',a:'A',b:'C',areaIn2:2,elasticModulusPsi:1e6}],
 loads:[],supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}]
};
test('explicit gravity and uplift scenarios produce signed axial envelopes',()=>{
 const r=analyzeExplicitScenarios(base,[
  {id:'gravity',description:'illustrative downward load',jointLoads:[{nodeId:'B',fyLb:-1000}]},
  {id:'uplift',description:'illustrative upward load',jointLoads:[{nodeId:'B',fyLb:500}]}
 ]);
 assert.equal(r.cases.length,2);
 assert.equal(r.envelope.memberForces.AB.governingMinCase,'gravity');
 assert.equal(r.envelope.memberForces.AB.governingMaxCase,'uplift');
 assert.equal(r.status,'PRELIMINARY_NOT_ENGINEERED');
});
test('duplicate scenario IDs and invalid node loads are rejected',()=>{
 const x={id:'a',description:'test',jointLoads:[{nodeId:'B',fyLb:-100}]};
 assert.throws(()=>analyzeExplicitScenarios(base,[x,x]));
 assert.throws(()=>analyzeExplicitScenarios(base,[{...x,jointLoads:[{nodeId:'missing',fyLb:100}]}]));
});
