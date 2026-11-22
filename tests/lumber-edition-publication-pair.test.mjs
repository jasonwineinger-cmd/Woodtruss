import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewLumberEditionPublicationPair } from '../dist/lumber/src/edition-publication-pair.js';

const artifact=(id,char)=>({edition:'2097',id,sha256:char.repeat(64)});
const expected={
 ruleEdition:'2097',publisher:'Synthetic publisher',
 nds:artifact('base-a','1'),supplement:artifact('base-b','2'),
 ndsUpdates:[artifact('errata-a1','3'),artifact('errata-a2','4')],
 supplementUpdates:[artifact('errata-b1','5'),artifact('errata-b2','6')],
};
const inspect=(mutate)=>{const observed=structuredClone(expected);mutate?.(observed);return reviewLumberEditionPublicationPair(expected,observed);};
const noAuthority=result=>{
 assert.equal(result.publisherVerified,false);
 assert.equal(result.licensedAuthorizationVerified,false);
 assert.equal(result.ndsReady,false);
 assert.equal(result.approvedForStructuralUse,false);
 assert.ok(Array.isArray(result.outstanding));
};
const hold=mutate=>{
 const result=inspect(mutate);
 assert.equal(result.documentationStatus,'HOLD_EDITION_PUBLICATION_PAIR');
 noAuthority(result);
 assert.ok(result.outstanding.length>0);
};

test('documented exact edition and independent role sets match regardless of within-role errata order',()=>{
 const result=inspect(observed=>{observed.ndsUpdates.reverse();observed.supplementUpdates.reverse();});
 assert.equal(result.documentationStatus,'DOCUMENTED_PAIR_NOT_VERIFIED');
 noAuthority(result);
 assert.deepEqual(result.outstanding,[]);
});

test('holds editions, role identities, malformed publisher and malformed artifact digests',()=>{
 for(const mutate of [
  o=>{o.ruleEdition='2096';},o=>{o.nds.edition='2096';},
  o=>{o.supplement.edition='2096';},o=>{o.ndsUpdates[0].edition='2096';},o=>{o.publisher='Other publisher';},
  o=>{o.publisher=' ';},o=>{o.nds.sha256='f'.repeat(63);},
  o=>{o.supplement.sha256='z'.repeat(64);},o=>{[o.nds,o.supplement]=[o.supplement,o.nds];},
 ]) hold(mutate);
});

test('holds missing, extra, substituted and wrong-role errata and requires explicit role arrays',()=>{
 for(const mutate of [
  o=>{o.ndsUpdates.pop();},o=>{o.supplementUpdates.push(artifact('extra','7'));},
  o=>{o.ndsUpdates[0].sha256='8'.repeat(64);},
  o=>{[o.ndsUpdates[0],o.supplementUpdates[0]]=[o.supplementUpdates[0],o.ndsUpdates[0]];},
  o=>{delete o.ndsUpdates;},o=>{delete o.supplementUpdates;},
 ]) hold(mutate);
});

test('holds duplicate artifact identities within and across roles, and never accepts supplied reference values',()=>{
 for(const mutate of [
  o=>{o.ndsUpdates.push({...o.ndsUpdates[0]});},
  o=>{o.supplementUpdates[0]={...o.ndsUpdates[0]};},
  o=>{o.supplementUpdates[0]={...o.nds};},
  o=>{o.supplementUpdates[0].id=o.ndsUpdates[0].id;},
  o=>{o.supplementUpdates[0].sha256=o.ndsUpdates[0].sha256;},
  o=>{o.supplement={...o.nds};},
  o=>{o.referenceValues={fbPsi:1234};},o=>{o.nds.fbPsi=1234;},
 ]) hold(mutate);
 // Identically malformed expected and observed declarations cannot pass by agreement.
 const duplicate=structuredClone(expected);
 duplicate.supplementUpdates[0]={...duplicate.ndsUpdates[0]};
 const result=reviewLumberEditionPublicationPair(duplicate,duplicate);
 assert.equal(result.documentationStatus,'HOLD_EDITION_PUBLICATION_PAIR');
 noAuthority(result);
 assert.ok(result.outstanding.length>0);
});

test('holds placeholder digests, excessive or sparse updates, and getters without invoking them',()=>{
 const placeholder=structuredClone(expected);
 placeholder.nds.sha256='0'.repeat(64);
 assert.equal(reviewLumberEditionPublicationPair(placeholder,placeholder).documentationStatus,'HOLD_EDITION_PUBLICATION_PAIR');
 hold(o=>{o.ndsUpdates=Array.from({length:33},(_,i)=>artifact('extra-'+i,'7'));});
 hold(o=>{delete o.supplementUpdates[0];});
 let getterCalls=0;
 hold(o=>{Object.defineProperty(o.nds,'sha256',{enumerable:true,get(){getterCalls++;return expected.nds.sha256;}});});
 assert.equal(getterCalls,0);
});
