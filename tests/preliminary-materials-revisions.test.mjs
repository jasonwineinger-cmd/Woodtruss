import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreliminaryMaterialsReport} from '../dist/fabrication/src/preliminary-materials.js';
import {comparePreliminaryMaterialsRevisions,parsePreliminaryMaterialsSnapshot} from '../dist/fabrication/src/preliminary-materials-revisions.js';

const a={id:'A',x:0,y:0}, b={id:'B',x:3,y:4}, c={id:'C',x:10,y:1}, d={id:'D',x:10,y:2};
const ab={id:'ab',a:'A',b:'B'}, ac={id:'ac',a:'A',b:'C'};
const persist=x=>JSON.parse(JSON.stringify(x));
const snap=(revision,nodes=[a,b,c],bars=[ab,ac],design='design')=>persist(createPreliminaryMaterialsReport(design,revision,{nodes,bars}));

test('round-trips v1 and reports deterministic directional ID differences including equal-length relocation',()=>{
  const before=snap('r1');
  const after=snap('r2',[d,{...b,y:-4},a],[{id:'ad',a:'A',b:'D'},ab]);
  assert.equal(before.members[0].centerlineLengthIn,after.members[0].centerlineLengthIn);
  assert.deepEqual(parsePreliminaryMaterialsSnapshot(before),before);
  const diff=comparePreliminaryMaterialsRevisions(before,after);
  assert.deepEqual(diff,{
    schemaVersion:'woodtruss.preliminary-materials-comparison.v1',designId:'design',fromRevisionId:'r1',toRevisionId:'r2',
    status:'PRELIMINARY_NOT_ENGINEERED',notice:'NOT FOR FABRICATION',fabricationAuthorized:false,units:{length:'in'},
    joints:{addedIds:['D'],removedIds:['C'],changedIds:['B']},
    members:{addedIds:['ad'],removedIds:['ac'],changedIds:['ab']},
  });
  const backwards=comparePreliminaryMaterialsRevisions(after,before);
  assert.deepEqual(backwards.members,{addedIds:['ac'],removedIds:['ad'],changedIds:['ab']});
  assert.throws(()=>diff.members.changedIds.push('other'),TypeError);
});

test('requires one design, distinct revisions, and marks reattached members even at unchanged length',()=>{
  const before=snap('r1');
  assert.throws(()=>comparePreliminaryMaterialsRevisions(before,snap('r1')),/distinct revision/i);
  assert.throws(()=>comparePreliminaryMaterialsRevisions(before,snap('r2',undefined,undefined,'other')),/different designs/i);
  assert.deepEqual(comparePreliminaryMaterialsRevisions(before,snap('r2')).members.changedIds,[]);
  const equalLengthEndpoint={id:'E',x:0,y:5};
  const retargeted=snap('r2',[a,b,c,equalLengthEndpoint],[{...ab,b:'E'},ac]);
  assert.equal(before.members[0].centerlineLengthIn,retargeted.members[0].centerlineLengthIn);
  assert.deepEqual(comparePreliminaryMaterialsRevisions(before,retargeted).members.changedIds,['ab']);
});

test('rejects forged release, raw members, substituted dimensions, versions, units, counts and extra data',()=>{
  const before=snap('r1');
  for (const corrupt of [
    r=>{r.fabricationAuthorized=true;}, r=>{r.notice='RELEASED';},
    r=>{r.schemaVersion='woodtruss.preliminary-materials.v2';}, r=>{r.units.length='mm';},
    r=>{r.cutList=[];}, r=>{r.members[0].cutLengthIn=5;},
    r=>{r.members[0].centerlineLengthIn+=1;}, r=>{r.modelMemberCount=3;},
    r=>{r.members[0].endJointIds=['A','MISSING'];}, r=>{r.members.push(r.members[0]);},
    r=>{r.joints.reverse();}, r=>{delete r.excludedFromInventory;},
  ]) {
    const bad=snap('r2');
    corrupt(bad);
    assert.throws(()=>parsePreliminaryMaterialsSnapshot(bad));
    assert.throws(()=>comparePreliminaryMaterialsRevisions(before,bad));
  }
  assert.throws(()=>parsePreliminaryMaterialsSnapshot({nodes:[a,b],bars:[ab]}));
});
