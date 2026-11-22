import assert from 'node:assert/strict';
import test from 'node:test';
import {reviewTpsxDesignQcLinks as review} from '../dist/fabrication/src/tpsx-design-qc-links.js';

const FormatVersion='0.9.4';
function fixture() {
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

test('links exact manifest, design and QC identifiers without treating quantity as files or approval',()=>{
 const out=review(fixture());
 assert.equal(out.status,'TPSX_DESIGN_QC_LINKS_MATCH_ONLY',JSON.stringify(out));
 assert.equal(out.jointCount,2);
 assert.equal(out.contactCount,4);
 assert.equal(out.memberQcCount,3);
 assertNoAuthority(out);
});

test('holds dangling links, swapped roles, wrong design identity, unsupported faces and duplicates',()=>{
 const attempts=[
  i=>{i.qc.TrussName='different mark';},
  i=>{i.qc.TrussId='synthetic-other-truss';},
  i=>{i.manifest.Components[1].ComponentType='SteelTruss';},
  i=>{i.manifest.Components[1].Quantity=0;},
  i=>{i.component.FormatVersion='0.9.3';},
  i=>{i.manifest.Components.push({...i.manifest.Components[1]});},
  i=>{i.component.Members.push({...i.component.Members[0]});},
  i=>{i.component.Plates.push({...i.component.Plates[0]});},
  i=>{i.component.Plating.push({...i.component.Plating[0]});},
  i=>{i.component.Plating[0].TrussFace='Front';},
  i=>{i.component.Plating[0].PlateId='placement-left';},
  i=>{i.qc.JointQC[0].PlatingId='P1';},
  i=>{i.qc.JointQC[0].PlatingId='PLACEMENT-LEFT';},
  i=>{i.qc.JointQC.push({...i.qc.JointQC[0]});},
  i=>{i.qc.JointQC[0].JointMembers=[];},
  i=>{i.qc.JointQC[0].JointMembers.pop();},
  i=>{i.qc.JointQC[1].JointMembers[1]={MemberId:"A"};},
  i=>{i.qc.JointQC[1].PlatingId="placement-left";},
  i=>{i.qc.MemberQC.pop();},
  i=>{i.qc.JointQC[0].JointMembers[1]={MemberId:'A'};},
  i=>{i.qc.JointQC[0].JointMembers[1]={MemberId:'absent'};},
  i=>{i.qc.MemberQC[1]={MemberId:'absent'};},
  i=>{i.qc.MemberQC[1]={MemberId:'A'};},
  i=>{i.component.Members=[];},
  i=>{i.fabricationAuthorized=true;},
 ];
 for(const change of attempts) {
  const input=fixture();
  change(input);
  const out=review(input);
  assert.equal(out.status,'HOLD_TPSX_DESIGN_QC_LINKS',change.toString());
  assertNoAuthority(out);
 }
});
