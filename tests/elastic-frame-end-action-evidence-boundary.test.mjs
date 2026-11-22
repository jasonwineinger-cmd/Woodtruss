import assert from 'node:assert/strict';
import test from 'node:test';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';
import { capturePlateForceEvidence, inventoryBoundConnectorPlateDemands } from '../dist/connections/src/plate-model-binding.js';

test('solved frame end-action vectors cannot stand in for exact connector force evidence', () => {
 const props = {areaIn2:2,elasticModulusPsi:1e6};
 const source = {revision:'fixture-r4',model:{
  nodes:[{id:'A',x:0,y:0},{id:'B',x:60,y:60},{id:'C',x:120,y:0}],
  bars:[['AB','A','B'],['BC','B','C'],['AC','A','C']].map(([id,a,b])=>({id,a,b,...props})),
  supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}],
 }};
 const scenario = {id:'down',loads:[{nodeId:'B',fxLb:0,fyLb:-100}]};
 const exact = capturePlateForceEvidence(source,scenario);
 const inventory = evidence => inventoryBoundConnectorPlateDemands(source,[scenario],[],[evidence]);
 const apex = inventory(exact).find(row=>row.jointId==='B');
 assert.equal(apex.status,'UNVERIFIED_CONNECTION');
 assert.equal(apex.fabricationAuthorized,false);

 const frame = solveElasticFrame({
  nodes:source.model.nodes.map(({id,x,y})=>({id,xIn:x,yIn:y})),
  members:source.model.bars.map(({id,a,b})=>({id,startNodeId:a,endNodeId:b,secondMomentIn4:12,...props})),
  supports:source.model.supports.map(s=>({...s,fixRotation:false})),
  loads:scenario.loads.map(load=>({...load,momentLbIn:0})),
 });
 assert.equal(frame.equilibrium.passes,true);
 assert.equal(frame.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(frame.fabricationAuthorized,false);
 assert.deepEqual(Object.keys(frame.memberEndActions).sort(),Object.keys(exact.axialForceLb).sort());
 assert.ok(Object.values(frame.memberEndActions).every(actions=>actions && typeof actions==='object'));
 assert.throws(()=>inventory({...exact,axialForceLb:frame.memberEndActions}),/exact solved axial forces/u);
});
