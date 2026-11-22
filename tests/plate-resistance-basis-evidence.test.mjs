import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewPlateResistanceBasisEvidence } from '../dist/connections/src/plate-resistance-basis-evidence.js';

const base={
 documentId:'private-fixture-document',productCode:'private-fixture-product',digestSha256:'a9'.repeat(32),
 locator:'private-fixture-locator',routeEvidenceId:'private-fixture-route',
 family:'integral-toothed',mechanism:'tooth-lateral',embedment:'hydraulic-platen',
 denominator:'per-square-inch-per-plate',sectionBasis:'gross',axisBasis:'slots-and-grain',faces:'paired-opposite',
};
const inspect=(scope={},changes={})=>{
 const expected={...base,...scope};
 return reviewPlateResistanceBasisEvidence(expected,{...expected,...changes});
};
function check(result,status){
 assert.equal(result.status,status);
 for(const key of ['applicabilityVerified','capacityVerified','fabricationAuthorized','machineReleaseAuthorized'])
  assert.equal(result[key],false);
 for(const key of ['documentId','productCode','digestSha256','locator','routeEvidenceId'])
  assert.ok(!JSON.stringify(result).includes(base[key]),'private evidence is not returned');
}
const ok=(scope)=>check(inspect(scope),'BASIS_MATCH_REVIEW_ONLY');
const hold=(scope={},changes={})=>check(inspect(scope,changes),'HOLD_RESISTANCE_BASIS');
const steel={mechanism:'steel-tension',denominator:'per-inch-per-pair',sectionBasis:'net',axisBasis:'signed-plate-axis'};
const hinge={family:'hinge',mechanism:'hinge-joint',denominator:'force-per-pair',sectionBasis:'not-applicable',axisBasis:'hinge-axis'};

test('documents only an exact typed tooth, steel, or hinge resistance basis',()=>{
 ok();
 ok({sectionBasis:'net',embedment:'staged-roller'});
 ok(steel);
 ok({...steel,family:'nail-applied',mechanism:'steel-shear',embedment:'separately-applied-nails'});
 ok(hinge);
});

test('self-agreeing but incompatible mechanism, units, section, axis, and installation cannot pass',()=>{
 for(const invalid of [
  {denominator:'per-inch-per-pair'},{sectionBasis:'not-applicable'},{axisBasis:'signed-plate-axis'},
  {family:'nail-applied',embedment:'separately-applied-nails'},{embedment:'separately-applied-nails'},
  {...steel,family:'hinge'},{...steel,family:'nail-applied'},{...steel,denominator:'force-per-pair'},
  {...steel,axisBasis:'slots-and-grain'},{...steel,sectionBasis:'not-applicable'},
  {...hinge,denominator:'per-square-inch-per-plate'},{...hinge,sectionBasis:'gross'},
  {...hinge,embedment:'separately-applied-nails'},{...hinge,axisBasis:'signed-plate-axis'},{...hinge,family:'integral-toothed'},
  {faces:'single-face'},
 ]) hold(invalid);
});

test('holds valid-but-different basis or source and excludes capacity data',()=>{
 for(const substitutions of [
  {documentId:'alternate'},{productCode:'other'},{digestSha256:'b1'.repeat(32)},{locator:'different'},
  {routeEvidenceId:'different'},{embedment:'pneumatic-platen'},{sectionBasis:'net'},
  {importedResistanceLb:123},{applicabilityVerified:true},{capacityVerified:true},{machineReleaseAuthorized:true},
 ]) hold({},substitutions);
 for(const malformed of [{digestSha256:'z'.repeat(64)},{locator:' '},{routeEvidenceId:null},{denominator:undefined}])
  hold(malformed);
});
