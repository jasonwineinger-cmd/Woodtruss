import test from 'node:test';
import assert from 'node:assert/strict';
import {previewEnvelopeLumberDemand} from '../dist/lumber/src/envelope-demand.js';
const catalog={catalogId:'TEST ONLY',records:[{speciesGroup:'TEST',grade:'TEST',nominalSize:'2x4',actualWidthIn:1.5,actualDepthIn:3.5,referenceEdition:'TEST',referencePublisher:'TEST',referenceTable:'TEST',referenceValueId:'TEST-2x4',fbPsi:1,ftPsi:1,fcPsi:1,fvPsi:1,ePsi:2,eMinPsi:1}]};
const envelope={status:'PRELIMINARY_NOT_ENGINEERED',memberForces:{M:{minLb:-1050,maxLb:525,governingMinCase:'gravity',governingMaxCase:'uplift'}},reactions:{},warnings:[]};
test('envelope demand separates governing tension and compression',()=>{
 const x=previewEnvelopeLumberDemand(envelope,catalog);
 assert.equal(x.length,1);
 assert.equal(x[0].tensionStressPsi,100);
 assert.equal(x[0].compressionStressPsi,200);
 assert.equal(x[0].tensionCase,'uplift');
 assert.equal(x[0].compressionCase,'gravity');
 assert.equal(x[0].approvedForStructuralUse,false);
});
test('rejects nonfinite and reversed envelopes',()=>{
 assert.throws(()=>previewEnvelopeLumberDemand({...envelope,memberForces:{M:{...envelope.memberForces.M,maxLb:NaN}}},catalog));
 assert.throws(()=>previewEnvelopeLumberDemand({...envelope,memberForces:{M:{...envelope.memberForces.M,minLb:1000}}},catalog));
});
