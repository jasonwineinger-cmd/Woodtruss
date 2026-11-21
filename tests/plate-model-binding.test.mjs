import assert from 'node:assert/strict';
import test from 'node:test';
import { capturePlateForceEvidence, inventoryBoundConnectorPlateDemands } from '../dist/connections/src/plate-model-binding.js';

const source={revision:'layout-r2',model:{
 nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:120},{id:'C',x:240,y:0}],
 bars:[['AB','A','B'],['BC','B','C'],['AC','A','C']].map(([id,a,b])=>({id,a,b,areaIn2:2,elasticModulusPsi:1e6})),
 supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}],
}};
const scenarios=[{id:'down',loads:[{nodeId:'B',fyLb:-1000}]},{id:'up',loads:[{nodeId:'B',fyLb:400}]}];
const capture=(binding=source,cases=scenarios)=>cases.map(s=>capturePlateForceEvidence(binding,s));
const demand=(binding=source,cases=scenarios,evidence=capture())=>inventoryBoundConnectorPlateDemands(binding,cases,[],evidence);

test('accepts only the coincident signed cases of the exact revision and is stable under table ordering',()=>{
 const reorder=structuredClone(source);
 for(const k of ['nodes','bars','supports'])reorder.model[k].reverse();
 const evidence=capture(reorder);
 assert.deepEqual(evidence,capture());
 const rows=demand(source,scenarios,evidence.reverse());
 const apex=rows.find(row=>row.jointId==='B');
 assert.equal(apex.sourceRevision,'layout-r2');
 assert.deepEqual(apex.scenarios.map(row=>row.scenarioId),['down','up']);
 assert.ok(Math.abs(apex.scenarios[0].members[0].memberOnJointFyLb-500)<1e-8);
 assert.ok(Math.abs(apex.scenarios[1].members[0].memberOnJointFyLb+200)<1e-8);
 assert.equal(apex.fabricationAuthorized,false);
 assert.equal(apex.status,'UNVERIFIED_CONNECTION');
 assert.equal('governingPlateForceLb' in apex,false);
});

test('rejects stale or altered equal-ID revision, topology, geometry, stiffness and support evidence',()=>{
 const mutations=[
  s=>s.revision='layout-r3',
  s=>s.model.nodes[1].y=121,
  s=>s.model.bars[0].areaIn2=2.5,
  s=>s.model.bars[0].elasticModulusPsi=1.1e6,
  s=>{[s.model.bars[0].a,s.model.bars[0].b]=[s.model.bars[0].b,s.model.bars[0].a];},
  s=>{[s.model.bars[0].id,s.model.bars[1].id]=[s.model.bars[1].id,s.model.bars[0].id];},
  s=>{s.model.supports[0].fixX=false;s.model.supports[1].fixX=true;},
 ];
 for(const mutate of mutations){
  const changed=structuredClone(source);mutate(changed);
  assert.throws(()=>demand(changed),/does not match expected/);
 }
});
test('rejects swapped case loads and stale force values even with current labels',()=>{
 const reversedLoads=scenarios.map((s,i)=>({...s,loads:scenarios[1-i].loads}));
 assert.throws(()=>demand(source,reversedLoads),/does not match expected/);
 const evidence=capture();
 [evidence[0].axialForceLb,evidence[1].axialForceLb]=[evidence[1].axialForceLb,evidence[0].axialForceLb];
 assert.throws(()=>demand(source,scenarios,evidence),/exact solved axial forces/);
 assert.throws(()=>demand(source,scenarios,[evidence[0],evidence[0]]),/Duplicate/);
});
