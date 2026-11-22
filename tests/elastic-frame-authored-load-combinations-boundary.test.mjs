import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAuthoredElasticFrameLoadCombinations } from '../dist/analysis/src/elastic-frame-authored-load-combinations.js';

const a={caseId:'primary',sourceRef:'fixture-primary',loads:[{nodeId:'A',fxLb:0,fyLb:-20,momentLbIn:0}]};
const b={caseId:'alternate',sourceRef:'fixture-alternate',loads:[{nodeId:'B',fxLb:0,fyLb:10,momentLbIn:0}]};
const combined={caseId:'custom',sourceRef:'fixture-combination',terms:[{caseId:a.caseId,factor:1},{caseId:b.caseId,factor:0.5}]};
const base={modelId:'frame-fixture',modelRevision:'r4',sources:[a,b],combinations:[combined]};
const build=(overrides)=>buildAuthoredElasticFrameLoadCombinations({...base,...overrides});
const terms=(...rows)=>({combinations:[{...combined,terms:rows}]});

test('authored frame combinations accept only exact authored inputs, not precomputed or approval fields',()=>{
 const result=build();
 assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(result.fabricationAuthorized,false);
 for(const overrides of [
  {result},
  {baseline:a.caseId},
  {combinations:[{...combined,computedLoads:a.loads}]},
  {combinations:[{...combined,capacityApproved:true}]},
  {sources:[{...a,memberRectangularStressExtrema:{}},b]},
  {sources:[{...a,loads:[{...a.loads[0],allowableMomentLbIn:100}]},b]},
 ]){
  assert.throws(()=>build(overrides));
 }
 assert.deepEqual(build(),result);
});

test('no missing, unknown, duplicate, inferred, or zero-factor authored terms',()=>{
 for(const overrides of [
  terms(),
  terms({caseId:'unknown',factor:1}),
  terms({caseId:a.caseId,factor:1},{caseId:a.caseId,factor:0.5}),
  terms({caseId:a.caseId}),
  terms({caseId:a.caseId,factor:0}),
  terms({caseId:a.caseId,factor:-0}),
  terms({caseId:a.caseId,factor:NaN}),
 ]){
  assert.throws(()=>build(overrides));
 }
});

test('non-coincident point stations or incompatible uniform bases on the same member are rejected',()=>{
 const point=(stationIn)=>[{memberId:'AB',stationIn,fxLb:0,fyLb:-25}];
 const uniform=(basis)=>[{memberId:'AB',basis,qxLbPerIn:0,qyLbPerIn:-3}];
 assert.doesNotThrow(()=>build({sources:[{...a,memberPointLoads:point(12)},{...b,memberPointLoads:point(12)}]}));
 assert.doesNotThrow(()=>build({sources:[{...a,memberLoads:uniform('member-length')},{...b,memberLoads:uniform('member-length')}]}));
 assert.throws(()=>build({sources:[{...a,memberPointLoads:point(12)},{...b,memberPointLoads:point(18)}]}),/station|point/iu);
 assert.throws(()=>build({sources:[{...a,memberLoads:uniform('member-length')},{...b,memberLoads:uniform('horizontal-projection')}]}),/basis|uniform/iu);
});

test('invalid unused authored source still holds the whole request',()=>{
 const future={caseId:'unused',sourceRef:'fixture-unused',loads:[{nodeId:'A',fxLb:0,fyLb:1,momentLbIn:0}]};
 assert.doesNotThrow(()=>build({sources:[a,b,future]}));
 assert.throws(()=>build({sources:[a,b,{...future,loads:[{...future.loads[0],fyLb:Infinity}]}]}),/load|finite|source/iu);
});
