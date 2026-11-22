import assert from 'node:assert/strict';
import test from 'node:test';
import {reviewTpsxDesignQcLinks as review} from '../dist/fabrication/src/tpsx-design-qc-links.js';

function fixture() {
  const FormatVersion='0.9.4', TrussId='PRIVATE-truss', TrussName='PRIVATE-name';
  const memberA={MemberId:'PRIVATE-member-a'}, memberB={MemberId:'PRIVATE-member-b'};
  const PlateId='PRIVATE-plate', PlatingId='PRIVATE-plating';
  return {
    manifest:{FormatVersion,Components:[{ComponentId:TrussId,ComponentName:TrussName,ComponentType:'WoodTruss',Quantity:1}]},
    component:{FormatVersion,TrussId,TrussName,Members:[{...memberA},{...memberB}],Plates:[{PlateId}],
      Plating:[{PlatingId,PlateId,TrussFace:'FrontBack'}]},
    qc:{FormatVersion,TrussId,TrussName,JointQC:[{JointLabel:'PRIVATE-joint',PlatingId,JointMembers:[{...memberA},{...memberB}]}],
      MemberQC:[{...memberA},{...memberB}]},
  };
}
function noEcho(result) {
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE|secret[./:]|getter ran/);
  for(const key of ['archiveVerified','designVerified','structuralAdequacyVerified','plateCapacityVerified',
    'signatureVerified','physicalInspectionVerified','repairClosureVerified','shippingAuthorized',
    'fabricationAuthorized','machineReleaseAuthorized']) assert.equal(result[key],false,key);
  for(const [key,value] of Object.entries(result)) {
    if (/approved|authorized|verified/i.test(key)) assert.equal(value,false,key);
  }
}

test('bounded normalized projection only: matching design references are private and not QC authority',()=>{
  const result=review(fixture());
  assert.equal(result.status,'TPSX_DESIGN_QC_LINKS_MATCH_ONLY');
  assert.equal(result.jointCount,1);
  assert.equal(result.contactCount,2);
  assert.equal(result.memberQcCount,2);
  assert.deepEqual(result.outstanding,[]);
  noEcho(result);
});

test('holds unlinked or ambiguous rows and refuses package bytes, claimed authority and extra destination data',()=>{
  let getters=0;
  const cases=[
    ()=>new Uint8Array([80,75,3,4]),
    i=>({...i,bytes:new Uint8Array([80,75,3,4])}),
    i=>({...i,url:'https://secret.invalid/design'}),
    i=>({...i,path:'/secret/design.tpsx'}),
    i=>{i.qc.JointQC[0].CapacityLb=1500;return i;},
    i=>{i.component.Plates[0].ReleaseAuthorized=true;return i;},
    i=>{i.manifest.Components[0].Url='https://secret.invalid/truss';return i;},
    i=>{i.component.FormatVersion='0.9.3';return i;},
    i=>{i.qc.TrussId='PRIVATE-other-id';return i;},
    i=>{i.qc.TrussName='PRIVATE-other-name';return i;},
    i=>{i.component.Plating[0].PlateId='PRIVATE-unlisted-plate';return i;},
    i=>{i.component.Plating[0].TrussFace='Front';return i;},
    i=>{i.qc.JointQC[0].PlatingId='PRIVATE-unlisted-plating';return i;},
    i=>{i.qc.JointQC[0].JointMembers[0].MemberId='PRIVATE-unlisted-member';return i;},
    i=>{i.qc.MemberQC.push({...i.qc.MemberQC[0]});return i;},
    i=>{Object.defineProperty(i.qc,'JointQC',{enumerable:true,get(){getters++;throw new Error('getter ran');}});return i;},
    i=>{Object.defineProperty(i.qc.JointQC[0].JointMembers[0],'MemberId',{enumerable:true,get(){getters++;throw new Error('getter ran');}});return i;},
  ];
  for(const [idx,mangle] of cases.entries()) {
    const result=review(mangle(fixture()));
    assert.equal(result.status,'HOLD_TPSX_DESIGN_QC_LINKS',`mutation ${idx} unexpectedly admitted`);
    for(const key of ['jointCount','contactCount','memberQcCount']) assert.equal(Object.hasOwn(result,key),false,key);
    assert.ok(result.outstanding.length>0);
    noEcho(result);
  }
  assert.equal(getters,0);
});
