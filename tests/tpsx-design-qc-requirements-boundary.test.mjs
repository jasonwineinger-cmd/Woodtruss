import assert from 'node:assert/strict';
import test from 'node:test';
import {reviewTpsxDesignQcLinks as reviewLinks} from '../dist/fabrication/src/tpsx-design-qc-links.js';
import {reviewTpsxDesignQcRequirements as review} from '../dist/fabrication/src/tpsx-design-qc-requirements.js';

const flags=['archiveVerified','designVerified','structuralAdequacyVerified','plateCapacityVerified',
  'signatureVerified','physicalInspectionVerified','repairClosureVerified','shippingAuthorized',
  'fabricationAuthorized','machineReleaseAuthorized','requirementSemanticsVerified'];
const countFields=['jointCount','contactCount','zeroTeethCount','zeroAreaCount','bothZeroCount','grossJointCount','netJointCount'];
function fixture() {
  const FormatVersion='0.9.4', TrussId='PRIVATE-truss', TrussName='PRIVATE-name';
  const identity={FormatVersion,TrussId,TrussName};
  const members=['PRIVATE-member-a','PRIVATE-member-b','PRIVATE-member-c'].map(MemberId=>({MemberId}));
  const PlateId='PRIVATE-plate', PlatingId='PRIVATE-plating';
  const identityRow={JointLabel:'PRIVATE-joint',PlatingId};
  return {
    links:{
      manifest:{FormatVersion,Components:[{ComponentId:TrussId,ComponentName:TrussName,ComponentType:'WoodTruss',Quantity:1}]},
      component:{...identity,Members:members.map(m=>({...m})),Plates:[{PlateId}],
        Plating:[{PlatingId,PlateId,TrussFace:'FrontBack'}]},
      qc:{...identity,JointQC:[{...identityRow,JointMembers:members.map(m=>({...m}))}],
        MemberQC:members.map(m=>({...m}))},
    },
    requirements:{...identity,DistanceUnit:'Inches',JointQC:[{...identityRow,AreaMethod:'Net',
      JointMembers:members.map((m,i)=>({...m,RequiredTeeth:[0,0,17][i],RequiredArea:[0,7.125,0][i]}))}]},
  };
}
function privateAndNoAuthority(result) {
  for(const field of flags) assert.equal(result[field],false,field);
  const wire=JSON.stringify(result);
  assert.doesNotMatch(wire,/PRIVATE|secret[./:]|getter ran|7\.125|\b17\b|RequiredTeeth|RequiredArea/);
}

test('counts authored zero patterns without leaking requirement values or upgrading independently scoped links',()=>{
  const input=fixture();
  assert.equal(reviewLinks(input.links).status,'TPSX_DESIGN_QC_LINKS_MATCH_ONLY');
  const result=review(input);
  assert.equal(result.status,'TPSX_DESIGN_QC_REQUIREMENTS_BOUND_ONLY');
  assert.deepEqual(result.outstanding,[]);
  assert.equal(result.jointCount,1);
  assert.equal(result.contactCount,3);
  assert.equal(result.grossJointCount,0);
  assert.equal(result.netJointCount,1);
  assert.equal(result.zeroTeethCount,2);
  assert.equal(result.zeroAreaCount,2);
  assert.equal(result.bothZeroCount,1);
  privateAndNoAuthority(result);
});

test('holds observations, caller authority, extra destinations, wrong joint links and unsafe scalar shapes',()=>{
  let getterCalls=0;
  const req=i=>i.requirements.JointQC[0];
  const row=i=>req(i).JointMembers[0];
  const cases=[
    i=>{i.links.component.Plating[0].PlateId='PRIVATE-dangling';},
    i=>{i.observations=[];},
    i=>{i.requirementSemanticsVerified=true;},
    i=>{i.requirements.DistanceUnit='Millimeters';},
    i=>{i.requirements.TrussId='PRIVATE-other-version';},
    i=>{i.requirements.url='https://secret.invalid/manufacture';},
    i=>{req(i).AreaMethod='Observed';},
    i=>{req(i).JointLabel='PRIVATE-wrong-joint';},
    i=>{req(i).PlatingId='PRIVATE-wrong-plating';},
    i=>{req(i).JointMembers.pop();},
    i=>{row(i).MemberId=req(i).JointMembers[1].MemberId;},
    i=>{row(i).ObservedTeeth=10;},
    i=>{row(i).inspectionAccepted=true;},
    i=>{row(i).RequiredTeeth=-1;},
    i=>{row(i).RequiredTeeth=0.5;},
    i=>{row(i).RequiredArea=NaN;},
    i=>{row(i).RequiredArea='7.125';},
    i=>{Object.defineProperty(row(i),'RequiredArea',{enumerable:true,get(){getterCalls++;throw new Error('getter ran');}});},
    i=>{Object.defineProperty(i,'requirements',{enumerable:true,get(){getterCalls++;throw new Error('getter ran');}});},
  ];
  for(const [idx,alter] of cases.entries()) {
    const input=fixture();
    alter(input);
    const result=review(input);
    assert.equal(result.status,'HOLD_TPSX_DESIGN_QC_REQUIREMENTS',`mutation ${idx} unexpectedly admitted`);
    for(const field of countFields) assert.equal(Object.hasOwn(result,field),false,field);
    assert.ok(result.outstanding.length>0);
    privateAndNoAuthority(result);
  }
  assert.equal(getterCalls,0);
});
