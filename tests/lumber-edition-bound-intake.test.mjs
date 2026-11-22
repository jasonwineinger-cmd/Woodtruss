import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { reviewLumberIntakeWithEditionEvidence } from '../dist/lumber/src/index.js';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const values={Fb:123451,Ft:123452,Fc:123453,Fv:123454,E:123456,Emin:123455};
const topics=['load-duration','moisture','temperature','size','repetitive-member','other-applicable'];
const edition='2099',publisher='Synthetic publisher';
function fixture(){
 const privateArtifacts=['rules','tables','rule-correction','table-correction'].map(artifactId=>({
  artifactId,bytes:Buffer.from(`Private synthetic bytes for ${artifactId}`),
 }));
 const [nds,supplement,ruleUpdate,tableUpdate]=privateArtifacts.map(({artifactId,bytes})=>({id:artifactId,edition,sha256:sha(bytes)}));
 const pair={ruleEdition:edition,publisher,nds,supplement,ndsUpdates:[ruleUpdate],supplementUpdates:[tableUpdate]};
 const stock={referenceValueId:'reference-1',speciesGroup:'synthetic',grade:'fixture',nominalSize:'fixture',
  actualWidthIn:2,actualDepthIn:3,referenceEdition:edition,referencePublisher:publisher,referenceTable:'synthetic-table'};
 const record={...stock,fbPsi:values.Fb,ftPsi:values.Ft,fcPsi:values.Fc,fvPsi:values.Fv,ePsi:values.E,eMinPsi:values.Emin};
 const catalog={catalogId:'synthetic-stock',records:[record]};
 const expectedQuantities=Object.keys(values).map((quantity,index)=>({quantity,unit:'psi',axisBasisId:`fixture:${quantity}`,
  sourceArtifactId:index===0?tableUpdate.id:supplement.id}));
 const idHash=({id,sha256})=>({id,sha256});
 const publication={publisher,edition,supplement:idHash(supplement),addenda:[idHash(tableUpdate)]};
 const receipts=expectedQuantities.map(expected=>({...expected,catalogId:catalog.catalogId,stock:{...stock},
  publication:structuredClone(publication),checkId:`private check ${expected.quantity}`,checkedValue:values[expected.quantity]}));
 const evidence={
  publicationPair:structuredClone(pair),
  reference:{checkedCatalogId:catalog.catalogId,checkedRecord:{...record},sourceDocumentSha256:tableUpdate.sha256,
   independentCheckRecordId:'private-stock-check'},
  factorScope:{referenceEdition:edition,referenceValueId:stock.referenceValueId,sourceDocumentSha256:ruleUpdate.sha256,
   checkedReferenceRecordId:'private-stock-check',reviewRecordId:'private-factor-scope',
   notes:topics.map(topic=>({topic,evidenceRecordId:`private factor ${topic}`}))},
 };
 return {catalog,referenceValueId:stock.referenceValueId,evidence,expectedPublicationPair:pair,
  expectedQuantities,receipts,privateArtifacts};
}
function noLeak(result,input){
 for(const flag of ['publisherVerified','licensedAuthorizationVerified','ndsReady','approvedForStructuralUse'])
  assert.equal(result[flag],false);
 const wire=JSON.stringify(result);
 for(const {bytes} of input.privateArtifacts){
  assert.ok(!wire.includes(bytes.toString()));
  assert.ok(!wire.includes(sha(bytes)));
 }
 assert.doesNotMatch(wire,/checkedValue|private check|private factor|private-stock-check|private-factor-scope|12345[1-6]/u);
}
async function held(change){
 const input=fixture();
 change(input);
 const result=await reviewLumberIntakeWithEditionEvidence(input);
 assert.equal(result.documentationStatus,'HOLD_EDITION_BOUND_INTAKE');
 assert.deepEqual(result.documentedQuantities,[]);
 assert.ok(result.outstanding.length>0);
 noLeak(result,input);
}

test('binds complete role bytes and six Supplement quantity receipts without releasing private or design evidence',async()=>{
 const input=fixture();
 const result=await reviewLumberIntakeWithEditionEvidence(input);
 assert.equal(result.documentationStatus,'DOCUMENTED_AND_ROLE_BYTES_MATCH_NOT_VERIFIED',JSON.stringify(result.outstanding));
 assert.deepEqual([...result.documentedQuantities].sort(),Object.keys(values).sort());
 assert.deepEqual(result.outstanding,[]);
 noLeak(result,input);
});

test('holds changed or missing declared rule and Supplement correction bytes as a whole',async()=>{
 for(const id of ['rules','tables','rule-correction','table-correction']){
  await held(i=>{i.privateArtifacts=i.privateArtifacts.filter(row=>row.artifactId!==id);});
  await held(i=>{i.privateArtifacts.find(row=>row.artifactId===id).bytes=Buffer.from('Changed private artifact');});
 }
});

test('holds wrong roles, mixed source publications and partial quantity evidence',async()=>{
 await held(i=>{
  const {nds,ndsUpdates}=i.expectedPublicationPair;
  i.receipts[0].publication.supplement={id:nds.id,sha256:nds.sha256};
  i.receipts[0].publication.addenda=ndsUpdates.map(({id,sha256})=>({id,sha256}));
 });
 await held(i=>{
  const ruleId=i.expectedPublicationPair.ndsUpdates[0].id;
  i.expectedQuantities[0].sourceArtifactId=ruleId;
  i.receipts[0].sourceArtifactId=ruleId;
 });
 await held(i=>{i.receipts[0].sourceArtifactId=i.expectedPublicationPair.supplement.id;});
 await held(i=>{i.receipts[3].publication.supplement.sha256='d'.repeat(64);});
 await held(i=>{i.receipts.pop();});
 await held(i=>{i.evidence.publicationPair.ndsUpdates=[];});
 await held(i=>{i.evidence.publicationPair.supplementUpdates=[];});
});
