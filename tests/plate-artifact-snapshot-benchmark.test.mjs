import assert from 'node:assert/strict';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { verifyLocalPlateSourceArtifact as verify } from '../dist/connections/src/plate-source-artifact.js';

// SHA-256 known-answer vector "abc"; not calculated by the function under test.
const digest='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const auth={purpose:'authorized-local-reference-review',sha256:digest};
const reference=()=>({
  identity:{manufacturer:'Synthetic',productCode:'Synthetic-code',family:'integral-toothed',issuer:'Synthetic',
    documentId:'SYNTHETIC-1',revisedMonth:'2026-08',digestSha256:digest,scope:'Synthetic test only',
    locator:'Synthetic scope',documentUrl:'https://example.test/synthetic.pdf'},
  basis:{use:'truss-member-joint',species:'Synthetic species',grade:'Synthetic grade',moistureAtAssembly:'dry',
    serviceMoisture:'dry',areaBasis:'gross',angleDatum:'plate-long-axis',angleSense:'clockwise',faces:'single'},
});
const check=bytes=>verify(reference(),auth,{reference:reference(),bytes});

test('a selected genuine private byte slice takes custody before the first await',async()=>{
  const bytes=Buffer.from([255,97,98,99,255]);
  const selected=bytes.subarray(1,4);
  const genuine=check(selected);
  bytes[2]=0;
  const mismatch=check(selected);
  bytes[2]=98;
  assert.equal((await genuine).status,'EXACT_ARTIFACT_REVIEW_ONLY');
  assert.equal((await mismatch).status,'HELD_UNVERIFIED');
  assert.equal((await check(bytes)).status,'HELD_UNVERIFIED');
  const typed=new Uint8Array([23,97,98,99,77]).subarray(1,4);
  let shadowRead=false;
  Object.defineProperty(typed,'byteOffset',{get(){shadowRead=true;throw new Error('not intrinsic');}});
  const matched=await check(typed);
  assert.equal(shadowRead,false);
  assert.equal(matched.exactAuthorizedBytesMatched,true);
  assert.equal(matched.fabricationAuthorized,false);
  assert.equal(JSON.stringify(matched).includes(digest),false);
});

test('lookalike or shared byte slots and accessor envelopes cannot establish byte custody',async()=>{
  const real=new Uint8Array([97,98,99]);
  const shared=new Uint8Array(new SharedArrayBuffer(3)); shared.set(real);
  const detached=real.slice();
  structuredClone(detached.buffer,{transfer:[detached.buffer]});
  for(const bytes of [shared,detached,new Proxy(real,{}),Object.create(Uint8Array.prototype),
    new Uint8ClampedArray(real),new DataView(real.buffer)]) {
    assert.equal((await check(bytes)).status,'HELD_UNVERIFIED');
  }
  for(const accessor of ['reference','bytes']){
    const supplied={reference:reference(),bytes:real};
    let called=false;
    Object.defineProperty(supplied,accessor,{enumerable:true,get(){
      called=true;return accessor==='bytes'?real:reference();
    }});
    const held=await verify(reference(),auth,supplied);
    assert.equal(held.status,'HELD_UNVERIFIED');
    assert.equal(held.exactAuthorizedBytesMatched,false);
    assert.equal(called,false);
  }
});

test('cross-realm slices use intrinsic backing data and detached views are held',async()=>{
  const crossRealm=runInNewContext('new Uint8Array([0,97,98,99,0]).subarray(1,4)');
  assert.equal(crossRealm instanceof Uint8Array,false);
  let read=false;
  for (const key of ['buffer','byteLength']) Object.defineProperty(crossRealm,key,{get(){
    read=true;throw new Error('shadowed pointer metadata must not be read');
  }});
  assert.equal((await check(crossRealm)).status,'EXACT_ARTIFACT_REVIEW_ONLY');
  assert.equal(read,false);
  const detached=new Uint8Array([97,98,99]);
  structuredClone(detached.buffer,{transfer:[detached.buffer]});
  assert.equal((await check(detached)).status,'HELD_UNVERIFIED');
});
