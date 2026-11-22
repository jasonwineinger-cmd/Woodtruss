import assert from 'node:assert/strict';
import test from 'node:test';
import {comparePlateScheduleEvidence} from '../dist/connections/src/plate-schedule-evidence.js';
const row=(rowId,faceId,lengthIn,widthIn)=>({rowId,jointId:'synthetic-joint',faceId,
 manufacturer:'Synthetic Fabricator',partDesignation:'EXAMPLE-1',sourceLocator:'synthetic callout '+rowId,
 observation:{state:'observed',lengthIn,widthIn}});
const fixture=()=>({revision:'sketch-r2',documentSha256:'b'.repeat(64),units:'in',
 rows:[row('a','front',3,2),row('b','back',4,2)]});

test('matches explicitly separate face observations, not an inferred pair or design finding',()=>{
 const expected=fixture(),supplied=fixture();supplied.rows.reverse();
 const check=comparePlateScheduleEvidence(expected,supplied);
 assert.equal(check.status,'SCHEDULE_EVIDENCE_REVIEW_ONLY');
 assert.equal(check.matchedRows,2);
 for(const gate of ['manufacturerSourceAuthenticated','oppositeFaceInferred','platePlacementApproved','capacityVerified',
  'engineeringApproved','fabricationAuthorized','machineReleaseAuthorized'])assert.equal(check[gate],false);
 const one={...expected,rows:[expected.rows[0]]};
 const observed=comparePlateScheduleEvidence(one,structuredClone(one));
 assert.equal(observed.matchedRows,1);
 assert.equal(observed.oppositeFaceInferred,false);
 assert.equal(JSON.stringify(check).includes('EXAMPLE-1'),false);
});

test('refuses guessed or missing dimensions, stale source, changed identity or unrecorded faces',()=>{
 const expected=fixture();
 for(const [change,hold] of [
  [s=>s.revision='sketch-r1','SCHEDULE_SOURCE_MISMATCH'],
  [s=>s.documentSha256='a'.repeat(64),'SCHEDULE_SOURCE_MISMATCH'],
  [s=>s.rows[0].faceId='back','SCHEDULE_ROWS_MISMATCH'],
  [s=>s.rows[0].partDesignation='EXAMPLE-2','SCHEDULE_ROWS_MISMATCH'],
  [s=>s.rows[0].sourceLocator='different callout','SCHEDULE_ROWS_MISMATCH'],
  [s=>s.rows[0].observation.lengthIn=2,'SCHEDULE_ROWS_MISMATCH'],
  [s=>s.rows.pop(),'SCHEDULE_ROWS_MISMATCH'],
  [s=>s.rows[1].rowId=s.rows[0].rowId,'SCHEDULE_INPUT_UNVERIFIED'],
  [s=>s.rows[1]={...s.rows[0],rowId:'duplicate-location'},'SCHEDULE_INPUT_UNVERIFIED'],
  [s=>s.rows[1].observation.lengthIn=null,'SCHEDULE_INPUT_UNVERIFIED'],
  [s=>s.rows[0].capacity=100,'SCHEDULE_INPUT_UNVERIFIED'],
 ]){
  const supplied=fixture();change(supplied);
  const out=comparePlateScheduleEvidence(expected,supplied);
  assert.equal(out.hold,hold);
  assert.equal(out.matchedRows,0);
 }
 expected.rows[0].observation={state:'unresolved',lengthIn:null,widthIn:null};
 const held=comparePlateScheduleEvidence(expected,structuredClone(expected));
 assert.equal(held.hold,'OBSERVATIONS_UNRESOLVED');
 assert.equal(held.unresolvedRows,1);
 assert.equal(comparePlateScheduleEvidence(expected,fixture()).hold,'SCHEDULE_ROWS_MISMATCH');
});
