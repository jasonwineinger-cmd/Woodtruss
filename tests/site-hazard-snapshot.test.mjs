import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {intakeGroundSnowSnapshot} from '../dist/analysis/src/site-hazard-snapshot.js';

// Synthetic bytes and values only; no real or licensed site hazard information.
const pdf=Buffer.from('%PDF-1.4\nSynthetic metadata test only\n%%EOF');
const sha=createHash('sha256').update(pdf).digest('hex');
const binding={projectId:'synthetic-project',siteId:'synthetic-site',latitude:0,longitude:0,
 edition:'7-22',riskCategory:'II',units:'US customary'};
const snapshot={binding,source:{publisher:'ASCE Hazard Tool',recordId:'local-fixture',reportDate:'2024-02-29',
 fileSha256:sha,transcriptionReference:'Synthetic source section'},groundSnow:{kind:'ground-snow',value:23,unit:'lb/ft²'}};

test('binds synthetic exact PDF bytes and preserves native ground-only numbers and holds',async()=>{
 const out=await intakeGroundSnowSnapshot(binding,snapshot,pdf);
 assert.deepEqual(out.binding,binding);
 assert.deepEqual(out.source,snapshot.source);
 assert.deepEqual(out.groundSnow,snapshot.groundSnow);
 assert.equal(out.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(out.reportBytesMatched,true);
 for (const flag of ['publisherAuthenticated','transcriptionVerified','roofSnowDerived','designApproved','manufacturingApproved'])
   assert.equal(out[flag],false);
 const si={...binding,units:'SI'};
 const zero=await intakeGroundSnowSnapshot(si,{...snapshot,binding:si,groundSnow:{kind:'ground-snow',value:0,unit:'kN/m²'}},pdf);
 assert.deepEqual(zero.groundSnow,{kind:'ground-snow',value:0,unit:'kN/m²'});
});

test('rejects changed site/project, coordinates, edition, risk or units as a binding change',async()=>{
 for(const change of [{projectId:'other'},{siteId:'other'},{latitude:0.01},{longitude:-0.01},
    {edition:'7-16'},{riskCategory:'III'},{units:'SI'}])
   await assert.rejects(intakeGroundSnowSnapshot({...binding,...change},snapshot,pdf),/exact expected/);
});

test('rejects distinct bytes, unknown provenance/edition, and unresolved or roof snow',async()=>{
 for(const [value,expected,error] of [
   [snapshot,binding,/PDF digest mismatch/],
   [{...snapshot,source:{...snapshot.source,reportDate:'2025-02-29'}},binding,/source report provenance/],
   [{...snapshot,source:{...snapshot.source,transcriptionReference:''}},binding,/source report provenance/],
   [{...snapshot,source:{...snapshot.source,fileSha256:'bad'}},binding,/source report provenance/],
   [{...snapshot,source:{...snapshot.source,publisher:'unknown'}},binding,/source report provenance/],
   [{...snapshot,binding:{...binding,edition:'41-23'}},binding,/Invalid site hazard binding/],
   [{...snapshot,groundSnow:{...snapshot.groundSnow,kind:'roof-snow'}},binding,/resolved ground snow/],
   [{...snapshot,groundSnow:{...snapshot.groundSnow,unit:'kN/m²'}},binding,/resolved ground snow/],
   [{...snapshot,groundSnow:{...snapshot.groundSnow,value:'Case Study'}},binding,/resolved ground snow/],
   [{...snapshot,groundSnow:{...snapshot.groundSnow,value:Infinity}},binding,/resolved ground snow/],
   [{...snapshot,roofPressurePsf:23},binding,/unrecognized hazard snapshot/],
 ])await assert.rejects(intakeGroundSnowSnapshot(expected,value,error.source.includes('digest mismatch')
   ?Buffer.concat([pdf,Buffer.from('changed')]):pdf),error);
});

test('snapshots validated fields and bytes before the asynchronous digest',async()=>{
 const raw=structuredClone(snapshot);
 const bytes=Buffer.from(pdf);
 const pending=intakeGroundSnowSnapshot(binding,raw,bytes);
 raw.groundSnow.value=99;
 raw.source.fileSha256='b'.repeat(64);
 bytes.fill(0);
 const out=await pending;
 assert.equal(out.groundSnow.value,23);
 assert.equal(out.source.fileSha256,sha);
});
