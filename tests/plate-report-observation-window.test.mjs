import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewPlateReportObservationWindow } from '../dist/connections/src/plate-report-observation-window.js';

const base={
 issuer:'Private synthetic issuer',documentId:'private-fixture-report',productCode:'private-fixture-product',
 digestSha256:'a9'.repeat(32),reissuedMonth:'2095-12',revisedMonth:'2096-01',
 issuerCheckedOn:'2096-02-29',issuerStatus:'active',
 windowBasis:'continuous-through-month-end',windowMonth:'2096-02',
};
const inspect=(expected={},observed={},reviewDate)=>{
 const input={...base,...expected};
 return reviewPlateReportObservationWindow(input,{...input,...observed},reviewDate??input.issuerCheckedOn);
};
function noAuthority(result){
 for(const key of ['issuerStatusVerified','applicabilityVerified','capacityVerified','fabricationAuthorized','machineReleaseAuthorized'])
  assert.equal(result[key],false);
 const wire=JSON.stringify(result);
 for(const key of ['issuer','documentId','productCode','digestSha256']){
  assert.ok(!wire.includes(base[key]),'Private declaration is not returned');
 }
}
function held(result){
 assert.equal(result.status,'HOLD_REPORT_OBSERVATION');
 noAuthority(result);
}

test('continuous observation includes leap day at month-end but not the next date',()=>{
 const result=inspect();
 assert.equal(result.status,'OBSERVATION_MATCH_REVIEW_ONLY');
 noAuthority(result);
 held(inspect({issuerCheckedOn:'2096-03-01'}));
 held(inspect({issuerCheckedOn:'2095-02-29',reissuedMonth:'2095-01',revisedMonth:'2095-02',windowMonth:'2095-02'}));
 held(inspect({}, {}, '2096-02-30'));
});

test('a named renewal month alone cannot justify observation starting on its first day',()=>{
 const phase={windowBasis:'renewal-month-only'};
 const prior=inspect({...phase,issuerCheckedOn:'2096-01-31'});
 assert.equal(prior.status,'OBSERVATION_MATCH_REVIEW_ONLY');
 noAuthority(prior);
 held(inspect({...phase,issuerCheckedOn:'2096-02-01'}));
 held(inspect({...phase,issuerCheckedOn:'2096-02-29'}));
});

test('holds self-agreeing non-active, stale or pre-revision metadata and exact source substitutions',()=>{
 for(const issuerStatus of ['withdrawn','superseded','unverified']) held(inspect({issuerStatus}));
 held(inspect({issuerCheckedOn:'2095-12-31'}));
 held(inspect({}, {}, '2096-02-28'));
 for(const change of [
  {issuer:'different issuer'},{documentId:'different report'},{productCode:'different product'},
  {digestSha256:'b1'.repeat(32)},{revisedMonth:'2096-02'},{reissuedMonth:'2095-11'},{windowMonth:'2096-03'},
  {issuerCheckedOn:'2096-02-28'},{windowBasis:'renewal-month-only'},
  {issuerStatusVerified:true},{allowableLoadLb:9300},
 ]) held(inspect({},change));
});
