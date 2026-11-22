import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewDatedLocalPlateReport } from '../dist/connections/src/plate-dated-local-report-review.js';

function fixture() {
 const bytes=Buffer.from('Distinct synthetic report bytes with no design data.');
 const digestSha256=createHash('sha256').update(bytes).digest('hex');
 const report={issuer:'Private test issuer',documentId:'PRIVATE-RPT',productCode:'PRIVATE-PLATE',digestSha256,
  reissuedMonth:'2097-01',revisedMonth:'2097-02',issuerCheckedOn:'2097-04-30',issuerStatus:'active',
  windowBasis:'continuous-through-month-end',windowMonth:'2097-04'};
 const {issuer,documentId,productCode,revisedMonth}=report;
 const reference={identity:{manufacturer:'Private test manufacturer',family:'integral-toothed',issuer,documentId,productCode,revisedMonth,
  digestSha256,scope:'Synthetic base',locator:'Private section label',documentUrl:'https://example.test/controlled-report.pdf'},
  basis:{use:'truss-member-joint',species:'Synthetic species',grade:'Synthetic stock',moistureAtAssembly:'dry',
   serviceMoisture:'dry',areaBasis:'net',angleDatum:'plate-long-axis',angleSense:'counterclockwise',faces:'paired-opposite'}};
 return {expectedReference:reference,expectedReport:report,authorization:{purpose:'authorized-local-reference-review',sha256:digestSha256},
  reviewDate:report.issuerCheckedOn,supplied:{report:{...report},reference:structuredClone(reference),bytes}};
}
function checkAuthority(result,input) {
 for(const flag of ['issuerStatusVerified','manufacturerSourceAuthenticated','applicabilityVerified','capacityVerified',
  'engineeringApproved','fabricationAuthorized','machineReleaseAuthorized']) assert.equal(result[flag],false);
 const message=JSON.stringify(result);
 assert.doesNotMatch(message,/Private|PRIVATE-|example\.test|Distinct synthetic/);
 assert.ok(!message.includes(input.expectedReport.digestSha256));
}

test('combines current-day coverage and exact separately authorized local report in documentation mode only',async()=>{
 const input=fixture();
 const result=await reviewDatedLocalPlateReport(input);
 assert.equal(result.status,'DOCUMENTED_DATED_LOCAL_REPORT_ONLY',JSON.stringify(result.outstanding));
 assert.deepEqual(result.outstanding,[]);
 checkAuthority(result,input);
});

test('archive bytes cannot cure a stale issuer check, old revision, report substitution or missing consent',async()=>{
 for(const apply of [
  i=>{i.reviewDate='2097-04-29';},
  i=>{i.expectedReport.issuerStatus=i.supplied.report.issuerStatus='withdrawn';},
  i=>{i.expectedReport.productCode=i.supplied.report.productCode='PRIVATE-REPLACEMENT';},
  i=>{i.expectedReport.revisedMonth=i.supplied.report.revisedMonth='2097-03';},
  i=>{i.expectedReport.digestSha256=i.supplied.report.digestSha256='a'.repeat(64);},
  i=>{i.supplied.reference.identity.scope='A different jurisdiction supplement';},
  i=>{i.authorization=null;},
  i=>{i.supplied.bytes[0]=0;},
  i=>{i.supplied.bytes=new Uint8Array(new SharedArrayBuffer(20));},
 ]) {
  const input=fixture();
  apply(input);
  const result=await reviewDatedLocalPlateReport(input);
  assert.equal(result.status,'HOLD_DATED_LOCAL_REPORT');
  assert.ok(result.outstanding.length>0);
  checkAuthority(result,input);
 }
});
