import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLumberCatalog,previewLumberCandidates} from '../dist/lumber/src/catalog.js';
const record={speciesGroup:'ILLUSTRATIVE ONLY',grade:'TEST',nominalSize:'2x4',actualWidthIn:1.5,actualDepthIn:3.5,referenceEdition:'TEST EDITION',referencePublisher:'TEST PUBLISHER',referenceTable:'TEST TABLE',referenceValueId:'test-only-001',fbPsi:1,ftPsi:1,fcPsi:1,fvPsi:1,ePsi:2,eMinPsi:1};
const catalog={catalogId:'test-only',records:[record]};
test('traceable catalog produces unapproved stress previews',()=>{
 const c=previewLumberCandidates(catalog,-525);
 assert.equal(c.length,1);
 assert.equal(c[0].areaIn2,5.25);
 assert.equal(c[0].axialStressPsi,-100);
 assert.equal(c[0].approvedForStructuralUse,false);
});
test('catalog rejects absent provenance and nonfinite values',()=>{
 assert.throws(()=>validateLumberCatalog({catalogId:'',records:[record]}));
 assert.throws(()=>validateLumberCatalog({catalogId:'x',records:[{...record,referenceTable:''}]}));
 assert.throws(()=>validateLumberCatalog({catalogId:'x',records:[{...record,ePsi:NaN}]}));
 assert.throws(()=>validateLumberCatalog({catalogId:'x',records:[record,record]}));
});
