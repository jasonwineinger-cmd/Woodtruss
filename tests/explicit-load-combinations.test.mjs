import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeExplicitLoadCombinations,buildExplicitLoadCombinations} from '../dist/analysis/src/explicit-load-combinations.js';

const base={
 nodes:[{id:'A',x:0,y:0},{id:'B',x:120,y:120},{id:'C',x:240,y:0}],
 bars:[{id:'AB',a:'A',b:'B',areaIn2:2,elasticModulusPsi:1e6},
 {id:'BC',a:'B',b:'C',areaIn2:2,elasticModulusPsi:1e6},
 {id:'AC',a:'A',b:'C',areaIn2:2,elasticModulusPsi:1e6}],
 loads:[{nodeId:'B',fyLb:7777}],supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}]
};
const gravity={id:'g',description:'downward benchmark load',provenance:'user worksheet G',jointLoads:[{nodeId:'B',fyLb:-1000}]};
const uplift={id:'u',description:'upward benchmark load',provenance:'user worksheet U',jointLoads:[{nodeId:'B',fyLb:500}]};
const definition={id:'signed',description:'illustrative signed superposition',provenance:'user worksheet S',
 terms:[{caseId:'g',factor:0.5},{caseId:'u',factor:-2}]};

test('signed factors combine explicit vectors and solve the independently known triangle response',()=>{
 const inputBefore=JSON.stringify([base,gravity,uplift,definition]);
 const solved=analyzeExplicitLoadCombinations(base,[gravity,uplift],[definition,{...definition,id:'cancel',
   terms:[{caseId:'g',factor:0.5},{caseId:'u',factor:1}]}]);
 assert.equal(JSON.stringify([base,gravity,uplift,definition]),inputBefore);
 assert.equal(solved.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.deepEqual(solved.authoredCombinations[0],{
   id:'signed',description:definition.description,combinationProvenance:definition.provenance,
   terms:[{caseId:'g',factor:0.5,caseProvenance:gravity.provenance},{caseId:'u',factor:-2,caseProvenance:uplift.provenance}],
   jointLoads:[{nodeId:'B',fxLb:0,fyLb:-1500}]
 });
 const [signed,cancel]=solved.cases;
 assert.deepEqual(cancel.model.loads,[{nodeId:'B',fxLb:0,fyLb:0}]);
 assert.equal(cancel.result.axialForceLb.AB,0);
 const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} ≠ ${expected}`);
 close(signed.result.reactionLb.A.y,750);
 close(signed.result.reactionLb.C.y,750);
 close(signed.result.axialForceLb.AB,-1500/Math.sqrt(2));
 close(signed.result.axialForceLb.BC,-1500/Math.sqrt(2));
 close(signed.result.axialForceLb.AC,750);
 assert.ok(solved.warnings.some(message=>message.includes('not building-code')));
});

test('combines both axes on different joints in stable model order',()=>{
 const source={...gravity,jointLoads:[{nodeId:'C',fxLb:100},{nodeId:'B',fyLb:-60}]};
 const second={...uplift,jointLoads:[{nodeId:'B',fxLb:-200,fyLb:10}]};
 assert.deepEqual(buildExplicitLoadCombinations(base,[source,second],[definition])[0].jointLoads,[
   {nodeId:'B',fxLb:400,fyLb:-50},{nodeId:'C',fxLb:50,fyLb:0},
 ]);
});

test('rejects invalid provenance, IDs, joint rows, duplicate and nonfinite terms, and overflow',()=>{
 const bad=[
   [[{...gravity,provenance:' '},uplift],[definition],/provenance/],
   [[gravity,uplift],[{...definition,provenance:''}],/provenance/],
   [[gravity,gravity,uplift],[definition],/Duplicate source/],
   [[gravity,uplift],[definition,definition],/Duplicate combination/],
   [[gravity,uplift],[{...definition,id:'g'}],/Duplicate combination/],
   [[gravity,uplift],[{...definition,terms:[]}],/At least one explicit term/],
   [[gravity,uplift],[{...definition,terms:[{caseId:'unknown',factor:1}]}],/Unknown source/],
   [[gravity,uplift],[{...definition,terms:[definition.terms[0],definition.terms[0]]}],/Duplicate combination term/],
   [[gravity,uplift],[{...definition,terms:[{caseId:'g',factor:NaN}]}],/Nonfinite/],
   [[gravity,uplift],[{...definition,terms:[{caseId:'g',factor:Number.MAX_VALUE}]}],/overflow/],
   [[{...gravity,jointLoads:[{nodeId:'missing',fxLb:1}]},uplift],[definition],/Invalid source joint load/],
   [[{...gravity,jointLoads:[{nodeId:'B',fxLb:Infinity}]},uplift],[definition],/Invalid source joint load/],
   [[{...gravity,jointLoads:[...gravity.jointLoads,...gravity.jointLoads]},uplift],[definition],/Duplicate joint load/],
 ];
 for (const [cases,combinations,error] of bad)
   assert.throws(()=>buildExplicitLoadCombinations(base,cases,combinations),error);
});
