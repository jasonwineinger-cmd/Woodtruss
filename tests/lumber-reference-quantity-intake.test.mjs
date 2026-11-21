import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewLumberReferenceQuantityIntake} from '../dist/lumber/src/index.js';

// Metadata and values are synthetic, not any licensed table or standard policy.
const publication={publisher:'synthetic house',edition:'edition-1',supplement:{id:'supplement',sha256:'a'.repeat(64)},
  addenda:[{id:'correction-a',sha256:'b'.repeat(64)},{id:'correction-b',sha256:'c'.repeat(64)}]};
const stock={referenceValueId:'record',speciesGroup:'fixture',grade:'test grade',nominalSize:'test rectangle',
  actualWidthIn:2,actualDepthIn:3,referencePublisher:publication.publisher,referenceEdition:publication.edition,
  referenceTable:'test row'};
const checked={Fb:123456,Ft:234567,Fc:345678,Fv:456789,E:567890,Emin:456780};
const catalog={catalogId:'fixture',records:[{...stock,fbPsi:checked.Fb,ftPsi:checked.Ft,fcPsi:checked.Fc,
  fvPsi:checked.Fv,ePsi:checked.E,eMinPsi:checked.Emin}]};
const expectRows=Object.keys(checked).map(quantity=>({quantity,unit:'psi',axisBasisId:'local receipt basis '+quantity}));
const evidence=()=>expectRows.map(row=>({...row,catalogId:catalog.catalogId,stock:{...stock},
  publication:structuredClone(publication),checkId:'restricted check '+row.quantity,checkedValue:checked[row.quantity]}));
const review=(receipts=evidence(),expect=expectRows,pub=publication)=>
  reviewLumberReferenceQuantityIntake(catalog,stock.referenceValueId,pub,expect,receipts);

test('documents an exact six-quantity row regardless of receipt/addendum order without returning checked values',()=>{
  const receipts=evidence().reverse();
  receipts[0].publication.addenda.reverse();
  const result=review(receipts);
  assert.equal(result.documentationStatus,'DOCUMENTED_NOT_VERIFIED');
  assert.deepEqual(result.documentedQuantities,['E','Emin','Fb','Fc','Ft','Fv']);
  assert.equal(result.ndsReady,false);
  assert.equal(result.sourceIndependentlyVerified,false);
  assert.doesNotMatch(JSON.stringify(result),/checkedValue|restricted check|123456|567890/);
});

test('holds swapped modulus quantities, bad units/axis, stale stock, mixed edition/publisher, and wrong addendum',()=>{
  for(const edit of [
    r=>r[0].unit='MPa',
    r=>r[0].axisBasisId='different axis evidence',
    r=>r[0].stock.grade='stale grade',
    r=>r[0].publication.publisher='other publisher',
    r=>r[0].publication.edition='edition-2',
    r=>r[0].publication.addenda.pop(),
    r=>r[0].publication.addenda[0].sha256='d'.repeat(64),
    r=>r.find(x=>x.quantity==='E').checkedValue=checked.Emin,
  ]) {
    const receipts=evidence();edit(receipts);
    const result=review(receipts);
    assert.equal(result.documentationStatus,'HOLD_MISSING_OR_STALE_QUANTITY_EVIDENCE');
    assert.deepEqual(result.documentedQuantities,[]);
    assert.equal(result.approvedForStructuralUse,false);
  }
});

test('never accepts duplicate, missing, or unknown scope or duplicate publication artifacts',()=>{
  const receipts=evidence();
  assert.throws(()=>review(receipts,[...expectRows,expectRows[0]]),/duplicate/);
  assert.match(review(receipts.slice(1)).outstanding.join(),/Missing quantity receipt: Fb/);
  assert.match(review(receipts,expectRows.slice(1)).outstanding.join(),/Missing explicit quantity expectation: Fb/);
  assert.match(review([...receipts,receipts[0]]).outstanding.join(),/Duplicate quantity receipt/);
  assert.match(review([...receipts,{...receipts[0],quantity:'Other'}]).outstanding.join(),/Unknown quantity receipt/);
  assert.match(review(receipts,expectRows,{...publication,addenda:[publication.supplement]}).outstanding.join(),/artifacts/);
});
