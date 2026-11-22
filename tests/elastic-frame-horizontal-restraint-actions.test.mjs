import assert from 'node:assert/strict';
import test from 'node:test';
import { addElasticFrameHorizontalRestraintForce } from '../dist/analysis/src/elastic-frame-horizontal-restraint-actions.js';

const plain=value=>JSON.parse(JSON.stringify(value));
const node=(nodeId,fxLb,fyLb=0,momentLbIn=0)=>({nodeId,fxLb,fyLb,momentLbIn});

test('restraint force replaces only the merged bearing X component and detaches original actions',()=>{
 const authored={loads:[node('L',-5,17,19),node('E',27,-30,14)],
  memberLoads:[{memberId:'LE',basis:'member-length',qxLbPerIn:1,qyLbPerIn:-6}],
  memberPointLoads:[{memberId:'LE',stationIn:12,fxLb:3,fyLb:4}]};
 const before=plain(authored);
 const merged=addElasticFrameHorizontalRestraintForce(authored,'E',-40);
 assert.deepEqual(plain(merged),{...before,loads:[before.loads[0],node('E',-13,-30,14)]});
 assert.deepEqual(authored,before);
 authored.loads[0].fyLb=99;
 authored.memberLoads[0].qyLbPerIn=8;
 authored.memberPointLoads[0].stationIn=21;
 assert.deepEqual(plain(merged),{...before,loads:[before.loads[0],node('E',-13,-30,14)]});
 assert.deepEqual(plain(addElasticFrameHorizontalRestraintForce({loads:[node('L',5)]},'E',6)).loads,
  [node('L',5),node('E',6)]);
});

test('exact rigid-limit cancellation remains an explicit zero without allowing lost or malformed actions',()=>{
 assert.deepEqual(plain(addElasticFrameHorizontalRestraintForce({loads:[node('E',11)]},'E',-11)),
  {loads:[node('E',0)]});
 for(const [authored,added] of [[1e100,1],[1,1e100],[Number.MAX_VALUE,Number.MAX_VALUE]]){
  assert.throws(()=>addElasticFrameHorizontalRestraintForce({loads:[node('E',authored)]},'E',added),
   /overflow or lost nonzero/u);
 }
 assert.throws(()=>addElasticFrameHorizontalRestraintForce({loads:[node('E',1),node('E',2)]},'E',3),/repeated/u);
 assert.throws(()=>addElasticFrameHorizontalRestraintForce({loads:[node('E',1)],capacityApproved:true},'E',3),/exact authored/iu);
});
