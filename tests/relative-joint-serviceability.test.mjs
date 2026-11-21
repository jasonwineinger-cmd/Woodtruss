import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeExplicitScenarios} from '../dist/analysis/src/scenarios.js';
import {relativeJointYMovement} from '../dist/analysis/src/relative-joint-serviceability.js';

const model={nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:120},{id:'C',x:240,y:0}],
 bars:[{id:'AB',a:'A',b:'B',areaIn2:2,elasticModulusPsi:1e6},
 {id:'BC',a:'B',b:'C',areaIn2:2,elasticModulusPsi:1e6},
 {id:'AC',a:'A',b:'C',areaIn2:2,elasticModulusPsi:1e6}],
 loads:[],supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}]};
const cases=()=>analyzeExplicitScenarios(model,[-1000,500].map((fyLb,i)=>({
 id:['down','up'][i],description:'synthetic point load',jointLoads:[{nodeId:'B',fyLb}],
}))).cases;
const input={expectedCaseIds:['down','up'],nodeId:'B',leftBearingNodeId:'A',rightBearingNodeId:'C'};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('uses exact named solved cases and agrees with independently derived triangle virtual work',()=>{
 const result=relativeJointYMovement(cases(),{...input,comparison:{maxAbsoluteIn:0.1,provenance:'illustrative owner threshold'}});
 const [down,up]=result.observations;
 const unitInfluence=(120*Math.SQRT2+240/4)/2e6;
 close(down.relativeYIn,-1000*unitInfluence);
 close(up.relativeYIn,500*unitInfluence);
 close(down.datumYIn,0);
 assert.equal(down.withinUserThreshold,false);
 assert.equal(up.withinUserThreshold,true);
 assert.equal(result.engineeringApproved,false);
 assert.equal(result.manufacturingApproved,false);
});

test('interpolates a nonzero bearing datum from a solved model with explicit X-only restraint',()=>{
 const tilted=structuredClone(model);
 tilted.nodes[2].y=120;
 tilted.supports[1]={nodeId:'C',fixX:true,fixY:false};
 const solved=analyzeExplicitScenarios(tilted,[{id:'down',description:'synthetic bearing load',
   jointLoads:[{nodeId:'C',fyLb:-1000}]}]).cases;
 const [down]=relativeJointYMovement(solved,{...input,expectedCaseIds:['down']}).observations;
 // At C only AC has a vertical force component: N_AC=-1000*sqrt(5).
 // The restrained X datum at C leaves axial shortening attributable to Y displacement.
 const right=-1000*5*Math.hypot(240,120)/2e6;
 close(down.rightYIn,right);
 close(down.leftYIn,0);
 close(down.datumYIn,right/2);
 close(down.relativeYIn,solved[0].result.displacementIn.B.y-right/2);
});

test('rejects wrong scope, unmodeled or inconsistent bearing datums, and invalid thresholds',()=>{
 const solved=cases();
 const inconsistent=structuredClone(solved);
 inconsistent[0].result.displacementIn.A.y=-0.2;
 assert.throws(()=>relativeJointYMovement(inconsistent,input),/inconsistent solved movement/);
 assert.throws(()=>relativeJointYMovement([...solved].reverse(),input),/case scope/);
 assert.throws(()=>relativeJointYMovement(solved,{...input,expectedCaseIds:['down']}),/case scope/);
 assert.throws(()=>relativeJointYMovement(solved,{...input,nodeId:'missing'}),/Unmodeled/);
 assert.throws(()=>relativeJointYMovement(solved,{...input,leftBearingNodeId:'C',rightBearingNodeId:'A'}),/strictly between/);
 assert.throws(()=>relativeJointYMovement(solved,{...input,nodeId:'A',leftBearingNodeId:'B'}),/explicit modeled restraint/);
 assert.throws(()=>relativeJointYMovement(solved,{...input,comparison:{maxAbsoluteIn:Infinity,provenance:'unknown'}}),/threshold/);
 const changed=cases();
 changed[1].model.nodes[1].x+=1;
 assert.throws(()=>relativeJointYMovement(changed,input),/Incompatible joint geometry/);
});
