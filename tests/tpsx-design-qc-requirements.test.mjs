import assert from 'node:assert/strict';
import test from 'node:test';
import {reviewTpsxDesignQcRequirements as review} from '../dist/fabrication/src/tpsx-design-qc-requirements.js';

const FormatVersion='0.9.4';
function linkFixture() {
 const TrussId='synthetic-truss-A', TrussName='synthetic mark A';
 return {
  manifest:{FormatVersion,Components:[
   {ComponentId:'synthetic-other-truss',ComponentName:'different mark',ComponentType:'WoodTruss',Quantity:1},
   {ComponentId:TrussId,ComponentName:TrussName,ComponentType:'WoodTruss',Quantity:7},
  ]},
  component:{FormatVersion,TrussId,TrussName,Members:[{MemberId:'A'},{MemberId:'B'},{MemberId:'C'}],
   Plates:[{PlateId:'P1'},{PlateId:'P2'}],
   Plating:[{PlatingId:'placement-left',PlateId:'P1',TrussFace:'FrontBack'},
    {PlatingId:'placement-right',PlateId:'P2',TrussFace:'TopBottom'}]},
  qc:{FormatVersion,TrussId,TrussName,JointQC:[
   {JointLabel:'J1',PlatingId:'placement-left',JointMembers:[{MemberId:'A'},{MemberId:'B'}]},
   {JointLabel:'J2',PlatingId:'placement-right',JointMembers:[{MemberId:'B'},{MemberId:'C'}]},
  ],MemberQC:[{MemberId:'A'},{MemberId:'B'},{MemberId:'C'}]},
 };
}
function assertNoAuthority(result) {
 assert.equal(result.fabricationAuthorized,false);
 assert.equal(result.machineReleaseAuthorized,false);
}

function fixture(){
 const links=linkFixture();
 const {TrussId,TrussName}=links.qc;
 return {links,requirements:{FormatVersion,TrussId,TrussName,DistanceUnit:'Inches',JointQC:[
  {JointLabel:'J1',PlatingId:'placement-left',AreaMethod:'Gross',
    JointMembers:[{MemberId:'A',RequiredTeeth:0,RequiredArea:0},{MemberId:'B',RequiredTeeth:0,RequiredArea:1.25}]},
  {JointLabel:'J2',PlatingId:'placement-right',AreaMethod:'Net',
    JointMembers:[{MemberId:'B',RequiredTeeth:4,RequiredArea:0},{MemberId:'C',RequiredTeeth:8,RequiredArea:3}]},
 ]}};
}

test('binds exact authored requirement contacts and distinguishes independent zeros without approval',()=>{
 const input=fixture();
 input.requirements.JointQC.reverse();
 input.requirements.JointQC[0].JointMembers.reverse();
 const out=review(input);
 assert.equal(out.status,'TPSX_DESIGN_QC_REQUIREMENTS_BOUND_ONLY',JSON.stringify(out));
 for(const [key,count] of Object.entries({jointCount:2,contactCount:4,zeroTeethCount:2,zeroAreaCount:2,
  bothZeroCount:1,grossJointCount:1,netJointCount:1})) assert.equal(out[key],count,key);
 assertNoAuthority(out);
});

test('holds missing and mismatched requirements; it never substitutes observations or inferred numbers',()=>{
 for(const change of [
  i=>{i.requirements.TrussId='synthetic-other-truss';},
  i=>{i.requirements.TrussName='different mark';},
  i=>{i.requirements.FormatVersion='0.9.3';},
  i=>{i.requirements.DistanceUnit='Millimeters';},
  i=>{delete i.requirements.DistanceUnit;},
  i=>{i.requirements.JointQC.pop();},
  i=>{i.requirements.JointQC[1].JointLabel='J1';},
  i=>{i.requirements.JointQC[0].PlatingId='placement-right';},
  i=>{i.requirements.JointQC[0].AreaMethod='Either';},
  i=>{i.requirements.JointQC[0].JointMembers.pop();},
  i=>{i.requirements.JointQC[0].JointMembers[0].MemberId='C';},
  i=>{i.requirements.JointQC[0].JointMembers[0].MemberId='B';},
  i=>{delete i.requirements.JointQC[0].JointMembers[0].RequiredTeeth;},
  i=>{delete i.requirements.JointQC[0].JointMembers[0].RequiredArea;},
  i=>{i.requirements.JointQC[0].JointMembers[0].RequiredTeeth=-1;},
  i=>{i.requirements.JointQC[0].JointMembers[0].RequiredTeeth=0.5;},
  i=>{i.requirements.JointQC[0].JointMembers[0].RequiredArea=Infinity;},
  i=>{i.requirements.JointQC[0].JointMembers[0].RequiredArea='0';},
  i=>{i.requirements.JointQC[0].JointMembers[0].MeasuredArea=2;},
  i=>{i.requirements.JointQC[0].JointMembers[0].ObservedTeeth=2;},
  i=>{i.links.qc.MemberQC.pop();},
  i=>{i.fabricationAuthorized=true;},
 ]) {
  const input=fixture();
  change(input);
  const out=review(input);
  assert.equal(out.status,'HOLD_TPSX_DESIGN_QC_REQUIREMENTS',change.toString());
  assertNoAuthority(out);
 }
});
