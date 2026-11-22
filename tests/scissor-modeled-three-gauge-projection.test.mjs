import assert from 'node:assert/strict';
import test from 'node:test';
import {bindScissorModeledThreeGauges,projectScissorModeledThreeGauges} from '../dist/analysis/src/scissor-modeled-three-gauge-projection.js';

const gauges=[{gaugeId:'top-left',nodeId:'Q1'},{gaugeId:'peak',nodeId:'R'},{gaugeId:'top-right',nodeId:'Q3'}];

test('projects signed downward vertical movement for exactly the authored gauges',()=>{
 const modeled=projectScissorModeledThreeGauges(gauges,{R:1,L:0,Q1:-5,Q3:0});
 assert.deepEqual(modeled.gauges,gauges.map((row,i)=>({...row,downwardIn:[5,-1,0][i]})));
 assert.equal(modeled.averageDownwardIn,4/3);
 const max=Number.MAX_VALUE;
 assert.equal(projectScissorModeledThreeGauges(gauges,{Q1:-max,R:-max,Q3:-max}).averageDownwardIn,max);
 assert.equal(projectScissorModeledThreeGauges(gauges,{Q1:-3,R:max,Q3:-max}).averageDownwardIn,1);
});

test('rejects implicit, duplicated, out-of-order or altered gauge data and missing displacements',()=>{
 const extra=Object.assign([...gauges],{expected:true});
 for(const bad of [undefined,gauges.slice(1),[...gauges].reverse(),extra,
  [gauges[0],{...gauges[1],gaugeId:gauges[0].gaugeId},gauges[2]],
  [gauges[0],{...gauges[1],nodeId:'B2'},gauges[2]],
  [gauges[0],{...gauges[1],measuredIn:2},gauges[2]],
 ]){
  assert.throws(()=>bindScissorModeledThreeGauges(bad),/gauge|plain data/iu);
 }
 for(const values of [{Q1:2,R:3},{Q1:2,R:NaN,Q3:4},{Q1:2,R:3,Q3:'4'}]){
  assert.throws(()=>projectScissorModeledThreeGauges(gauges,values),/displacement|plain data/iu);
 }
});
