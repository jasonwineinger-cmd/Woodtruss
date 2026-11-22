import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {reviewScopedPlateReportEvidence} from '../dist/connections/src/plate-scoped-local-evidence.js';
import {reviewPlateIdentificationReferenceEvidence} from '../dist/connections/src/plate-identification-reference-evidence.js';

const original = Buffer.from('Synthetic documents, no resistance values or real stock.');
function fixture() {
 const digestSha256=createHash('sha256').update(original).digest('hex');
 const report={issuer:'Example issuer',documentId:'Report A',productCode:'Product A',digestSha256,
  reissuedMonth:'2096-02',revisedMonth:'2096-03',issuerCheckedOn:'2096-04-10',issuerStatus:'active',
  windowBasis:'continuous-through-month-end',windowMonth:'2097-04'};
 const {issuer,documentId,productCode,revisedMonth}=report;
 const identity={issuer,documentId,productCode,revisedMonth,digestSha256,family:'integral-toothed',
  manufacturer:'Fixture manufacturer',scope:'Synthetic structural report',locator:'Private table location',
  documentUrl:'https://example.test/report.pdf'};
 const reference={identity,basis:{use:'truss-member-joint',species:'Synthetic species',grade:'Synthetic grade',
  moistureAtAssembly:'dry',serviceMoisture:'dry',areaBasis:'net',angleDatum:'plate-long-axis',
  angleSense:'counterclockwise',faces:'paired-opposite'}};
 const resistance={documentId,productCode,digestSha256,locator:identity.locator,routeEvidenceId:'Private method location',
  family:'integral-toothed',mechanism:'tooth-lateral',embedment:'hydraulic-platen',denominator:'per-square-inch-per-plate',
  sectionBasis:'net',axisBasis:'slots-and-grain',faces:'paired-opposite'};
 const identification={manufacturer:identity.manufacturer,productCode,embossedCode:'Product A as marked',
  boxReferenceId:'Index A',boxReferenceRole:'issuer-index',productEvaluationReportId:documentId,
  productEvaluationDigestSha256:digestSha256};
 return {expectedReference:reference,expectedReport:report,reviewDate:report.issuerCheckedOn,
  authorization:{purpose:'authorized-local-reference-review',sha256:digestSha256},
  supplied:{reference:structuredClone(reference),report:{...report},bytes:Buffer.from(original)},
  expectedResistance:resistance,observedResistance:{...resistance},
  expectedIdentification:identification,observedIdentification:{...identification}};
}

test('a separate index box label can be documented but is not the exact product report',async()=>{
 const input=fixture();
 const result=await reviewScopedPlateReportEvidence(input);
 assert.equal(result.status,'SCOPED_PLATE_REPORT_REVIEW_ONLY',JSON.stringify(result.outstanding));
 assert.deepEqual(result.outstanding,[]);
 const wire=JSON.stringify(result);
 assert.doesNotMatch(wire,/Private|Fixture manufacturer|Product A|Report A|Index A|Synthetic/);
 for(const flag of ['issuerStatusVerified','manufacturerAuthenticated','applicabilityVerified',
  'capacityVerified','engineeringApproved','fabricationAuthorized','machineReleaseAuthorized'])
  assert.equal(result[flag],false);
});

test('dated bytes cannot cure a mechanism, embedment route, locator, or label-report substitution',async()=>{
 for(const change of [
  i=>{i.observedResistance.embedment='single-pass-roller';},
  i=>{i.expectedResistance.locator=i.observedResistance.locator='Other table';},
  i=>{i.observedResistance.denominator='per-inch-per-pair';},
  i=>{i.expectedResistance.sectionBasis=i.observedResistance.sectionBasis='gross';},
  i=>{i.expectedIdentification.productEvaluationReportId=i.observedIdentification.productEvaluationReportId='Index A';},
  i=>{i.expectedIdentification.productEvaluationReportId=i.observedIdentification.productEvaluationReportId='Other report';},
  i=>{i.observedIdentification.embossedCode='Other mark';},
  i=>{i.supplied.bytes[0]=0;},
 ]) {
  const input=fixture();
  change(input);
  const result=await reviewScopedPlateReportEvidence(input);
  assert.equal(result.status,'HOLD_SCOPED_PLATE_REPORT');
  assert.ok(result.outstanding.length>0);
  assert.equal(result.capacityVerified,false);
 }
});

test('label identification may cite the direct report but never authenticates actual stock',()=>{
 const {expectedIdentification:label}=fixture();
 const direct={...label,boxReferenceId:label.productEvaluationReportId,boxReferenceRole:'product-evaluation-report'};
 const result=reviewPlateIdentificationReferenceEvidence(direct,{...direct});
 assert.equal(result.status,'IDENTIFICATION_MATCH_REVIEW_ONLY');
 assert.equal(result.manufacturerAuthenticated,false);
 assert.equal(result.productVerified,false);
 for(const bad of [
  {...direct, boxReferenceId:'Different report'},
  {...label, boxReferenceId:label.productEvaluationReportId},
  {...label, productEvaluationDigestSha256:'0'.repeat(64)},
  {...label, lotApproved:true},
 ]) assert.equal(reviewPlateIdentificationReferenceEvidence(bad,bad).status,'HOLD_PRODUCT_IDENTIFICATION');
});
