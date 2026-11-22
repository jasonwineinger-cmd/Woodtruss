import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeAuthoredModel} from '../dist/analysis/src/authored-model-analysis.js';

function fixture(){
 return {schema:'woodtruss-authored-model/v1',units:{length:'in',force:'lb',area:'in^2',elasticModulus:'psi'},
  modelId:'demo-triangle',modelRevision:'R1',provenance:'synthetic authored geometry',
  bearings:{leftNodeId:'A',rightNodeId:'C'},
  model:{nodes:[{id:'A',x:5,y:3},{id:'B',x:125,y:123},{id:'C',x:245,y:3}],
   bars:[['A','B'],['B','C'],['A','C']].map(([a,b])=>({id:a+b,a,b,areaIn2:2,elasticModulusPsi:1e6}))},
  loadCase:{id:'down',description:'synthetic point force',provenance:'independent synthetic force',jointLoads:[{nodeId:'B',fyLb:-1000}]},
 };
}
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);
test('strictly ingests and audits an authored triangle against independent reactions and tie force',()=>{
 const input=fixture(),before=JSON.stringify(input);
 const out=analyzeAuthoredModel(input);
 assert.equal(JSON.stringify(input),before);
 assert.equal(out.bearings.bearingSpanIn,240);
 assert.equal(out.bearings.configuration,'left-pin-right-vertical-roller');
 close(out.result.reactionLb.A.y,500);
 close(out.result.reactionLb.C.y,500);
 close(out.result.axialForceLb.AC,500);
 close(out.result.axialForceLb.AB,-1000/Math.SQRT2);
 assert.equal(out.loadCase.provenance,input.loadCase.provenance);
 assert.equal(out.equilibrium.global.passes,true);
 assert.equal(out.equilibrium.joint.passes,true);
 assert.equal(out.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(out.machineReleaseApproved,false);
 assert.equal(out.fabricationAuthorized,false);
});
test('holds wrong schema/units, unknown input, invalid bearings, unstated extent and oversized span',()=>{
 for(const [edit,error] of [
   [x=>{x.schema='other';},/Unsupported/],
   [x=>{x.units.length='ft';},/explicit.*units/],
   [x=>{x.model.supports=[];},/unknown.*model/],
   [x=>{x.model.nodes[1].extra=1;},/unknown.*node/],
   [x=>{x.bearings.leftNodeId='missing';},/modeled.*bearings/],
   [x=>{x.model.nodes[2].y+=1;},/level bearings/],
   [x=>{x.model.nodes[1].x=246;},/outside declared bearing extent/],
   [x=>{x.model.nodes[2].x=606;},/50 ft/],
   [x=>{x.model.nodes[2].x=100;},/8 to 50 ft/],
   [x=>{x.loadCase.jointLoads.push(x.loadCase.jointLoads[0]);},/Duplicate authored joint load/],
   [x=>{x.loadCase.jointLoads[0].nodeId='missing';},/Invalid explicit joint load/],
   [x=>{x.loadCase.jointLoads[0].fyLb=null;},/invalid authored number/],
   [x=>{x.model.nodes[1].id='constructor';},/Invalid authored identifier/],
   [x=>{x.model.nodes[1].y=3;},/singular|unstable/i],
 ]){
  const input=fixture();edit(input);
  assert.throws(()=>analyzeAuthoredModel(input),error);
 }
 const edge=fixture();edge.model.nodes[2].x=605;
 assert.equal(analyzeAuthoredModel(edge).bearings.bearingSpanIn,600);
});
