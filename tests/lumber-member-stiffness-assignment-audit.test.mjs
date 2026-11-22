import test from 'node:test';
import assert from 'node:assert/strict';
import {auditPreliminaryMemberStiffnessAssignments as audit} from '../dist/lumber/src/index.js';

const ref=(referenceValueId,actualDepthIn,ePsi,eMinPsi)=>({referenceValueId,actualWidthIn:2,actualDepthIn,ePsi,eMinPsi,
  speciesGroup:'synthetic',grade:'synthetic grade',nominalSize:'synthetic size',referenceEdition:'example',
  referencePublisher:'example',referenceTable:'example',fbPsi:100,ftPsi:150,fcPsi:200,fvPsi:50});
const catalog={catalogId:'synthetic',records:[ref('one',3,112233,90000),ref('two',4,222222,150001)]};
const modelRevisionId='synthetic-rev1';
const model={nodes:[{id:'a',x:0,y:0},{id:'b',x:60,y:0},{id:'c',x:120,y:0}],
  bars:[{id:'first',a:'a',b:'b',areaIn2:6,elasticModulusPsi:112233},
    {id:'second',a:'b',b:'c',areaIn2:8,elasticModulusPsi:150001}],loads:[],
  supports:[{nodeId:'a',fixX:true,fixY:true},{nodeId:'b',fixX:false,fixY:true},{nodeId:'c',fixX:false,fixY:true}]};
const assignments=model.bars.map((bar,i)=>({modelRevisionId,memberId:bar.id,fromNodeId:bar.a,toNodeId:bar.b,
  catalogId:catalog.catalogId,referenceValueId:catalog.records[i].referenceValueId,
  modulusBasis:i===0?'catalog-mean':'catalog-minimum',assignmentRecordId:'receipt-'+bar.id}));
const run=(rows=assignments,m=model)=>audit(m,modelRevisionId,catalog,rows);

test('reconciles distinct per-member areas and mean/minimum modulus assumptions without returning values',()=>{
  const r=run([...assignments].reverse());
  assert.deepEqual(r,run());
  assert.equal(r.numericalInputsReconciled,true);
  assert.equal(r.matchedCount,2);
  assert.equal(r.approvedForStructuralUse,false);
  assert.deepEqual(r.rows.map(x=>[x.memberId,x.referenceValueId,x.modulusBasis]),
    [['first','one','catalog-mean'],['second','two','catalog-minimum']]);
  assert.doesNotMatch(JSON.stringify(r),/112233|150001|elasticModulusPsi|eMinPsi/);
});

test('isolates wrong modulus, area, same-ID reversed incidence and missing evidence to the relevant member',()=>{
  const wrongChoice=[assignments[0],{...assignments[1],modulusBasis:'catalog-mean'}];
  assert.deepEqual(run(wrongChoice).rows.map(x=>x.holds.length),[0,1]);
  const old=[{...assignments[0],modelRevisionId:'synthetic-rev0',fromNodeId:'b',toNodeId:'a'},assignments[1]];
  assert.match(run(old).rows[0].holds[0],/stale/);
  const wrongArea={...model,bars:[{...model.bars[0],areaIn2:8},model.bars[1]]};
  assert.match(run(assignments,wrongArea).rows[0].holds[0],/area differs/);
  assert.equal(run(assignments.slice(1)).numericalInputsReconciled,false);
});

test('rejects duplicate member or receipt claims and unknown members before reporting completeness',()=>{
  assert.throws(()=>run([assignments[0],assignments[0]]));
  assert.throws(()=>run([assignments[0],{...assignments[1],assignmentRecordId:assignments[0].assignmentRecordId}]));
  assert.throws(()=>run([{...assignments[0],memberId:'unknown'}]));
  assert.throws(()=>audit(model,'',catalog,assignments));
});
