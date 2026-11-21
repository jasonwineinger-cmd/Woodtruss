import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { reviewLumberIntakeWithPrivatePublicationBytes } from '../dist/lumber/src/index.js';

const artifact=(artifactId,text)=>({artifactId,bytes:Buffer.from(text)});
const digest=({artifactId,bytes})=>({id:artifactId,sha256:createHash('sha256').update(bytes).digest('hex')});
const source=artifact('main','private synthetic main artifact');
const addon=artifact('add','private synthetic correction artifact');
const publication={publisher:'synthetic source',edition:'synthetic 1',supplement:digest(source),addenda:[digest(addon)]};
const basis={referenceValueId:'record',speciesGroup:'synthetic',grade:'test',nominalSize:'test',
  actualWidthIn:2,actualDepthIn:3,referencePublisher:publication.publisher,referenceEdition:publication.edition,referenceTable:'test'};
const raw={Fb:234568,Ft:234567,Fc:345678,Fv:456789,E:567890,Emin:456780};
const catalog={catalogId:'test',records:[{...basis,fbPsi:raw.Fb,ftPsi:raw.Ft,fcPsi:raw.Fc,fvPsi:raw.Fv,ePsi:raw.E,eMinPsi:raw.Emin}]};
const required=Object.keys(raw).map(quantity=>({quantity,unit:'psi',axisBasisId:'fixture:'+quantity}));
const receipts=required.map(row=>({...row,catalogId:catalog.catalogId,stock:basis,publication,
  checkId:'private check '+row.quantity,checkedValue:raw[row.quantity]}));
const check=(artifacts,declaredReceipts=receipts,pub=publication)=>
  reviewLumberIntakeWithPrivatePublicationBytes(catalog,basis.referenceValueId,pub,required,declaredReceipts,artifacts);

test('matches exact main and addendum bytes without exposing either bytes, values, or authorization',async()=>{
  const result=await check([addon,source]);
  assert.equal(result.artifactByteStatus,'MATCHES_EXPECTED_SHA256');
  assert.equal(result.documentationStatus,'DOCUMENTED_AND_BYTES_MATCH_NOT_VERIFIED');
  assert.equal(result.documentedQuantities.length,6);
  assert.equal(result.publisherEditionIndependentlyVerified,false);
  assert.equal(result.licensedAuthorizationVerified,false);
  assert.equal(result.ndsReady,false);
  assert.doesNotMatch(JSON.stringify(result),/private synthetic|checkedValue|private check|234568|567890/);
});

test('holds missing, modified, swapped, empty, duplicate and unexpected private artifact bytes',async()=>{
  for(const offered of [[source],[source,artifact('add','private synthetic correction artifacU')],
    [{...source,bytes:addon.bytes},{...addon,bytes:source.bytes}],[source,addon,addon],
    [source,addon,artifact('extra','extra')],[source,artifact('add','')]]) {
    const result=await check(offered);
    assert.equal(result.artifactByteStatus,'HOLD_ARTIFACT_BYTES');
    assert.equal(result.documentationStatus,'HOLD_REFERENCE_INTAKE');
    assert.equal(result.documentedQuantities.length,0);
  }
});

test('matching source bytes do not substitute for quantity, edition or addendum documentation',async()=>{
  const missing=await check([source,addon],receipts.slice(1));
  assert.equal(missing.artifactByteStatus,'MATCHES_EXPECTED_SHA256');
  assert.equal(missing.documentationStatus,'HOLD_REFERENCE_INTAKE');
  const mislabeled=await check([source,addon],receipts,{...publication,edition:'different edition'});
  assert.equal(mislabeled.artifactByteStatus,'MATCHES_EXPECTED_SHA256');
  assert.equal(mislabeled.documentationStatus,'HOLD_REFERENCE_INTAKE');
  assert.deepEqual(mislabeled.documentedQuantities,[]);
});
