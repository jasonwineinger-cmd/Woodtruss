import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreliminaryMaterialsReport} from '../dist/fabrication/src/preliminary-materials.js';
import {createPreliminaryMaterialsTraceabilityManifest,fingerprintPreliminaryMaterialsSource} from '../dist/fabrication/src/preliminary-materials-traceability.js';
import {tracePreliminaryMembers} from '../dist/fabrication/src/preliminary-member-trace.js';

const id=(id,x,y)=>({id,x,y}), member=(id,a,b)=>({id,a,b});
function model(next=false) {
  return {
    nodes:[id('A',0,0),id('B',3,next?-4:4),id('C',0,5),id('D',5,0)],
    bars:[
      member('fixed','A','C'),member('moved','A','B'),
      member('reattached','A',next?'D':'C'),member('reversed',next?'C':'A',next?'A':'C'),
      member(next?'added':'removed','A','D'),
    ],
  };
}
async function evidence(revisionId,geometry,designId='design') {
  const expected={designId,revisionId,sourceGeometrySha256:await fingerprintPreliminaryMaterialsSource(geometry)};
  const snapshot=createPreliminaryMaterialsReport(designId,revisionId,geometry);
  return {snapshot,expected,traceabilityManifest:await createPreliminaryMaterialsTraceabilityManifest(snapshot)};
}

test('source-bound trace distinguishes equal-length relocation, reattachment, reversal, additions and removals',async()=>{
  const prior=await evidence('r1',model()),next=await evidence('r2',model(true));
  const result=await tracePreliminaryMembers(prior,next,['removed','reversed','reattached','moved','fixed','added']);
  assert.equal(result.schemaVersion,'woodtruss.preliminary-member-trace.v1');
  assert.equal(result.prior.sourceGeometrySha256,prior.expected.sourceGeometrySha256);
  assert.equal(result.next.sourceGeometrySha256,next.expected.sourceGeometrySha256);
  assert.notEqual(result.prior.traceabilityManifestSha256,result.next.traceabilityManifestSha256);
  assert.deepEqual(result.members.map(r=>[r.modelMemberId,r.relation,r.centerlineLengthUnchanged]),[
    ['added','ONLY_IN_NEXT_REVISION',null],['fixed','SAME_SCHEMATIC_ENDPOINTS_ONLY',true],
    ['moved','ENDPOINT_COORDINATES_CHANGED',true],['reattached','ENDPOINT_IDENTITIES_CHANGED',true],
    ['removed','ONLY_IN_PRIOR_REVISION',null],['reversed','ENDPOINT_ORDER_REVERSED',true],
  ]);
  assert.deepEqual(result.members.find(r=>r.modelMemberId==='reattached').nextEndJointIds,['A','D']);
  assert.ok(result.members.every(r=>r.physicalContinuityVerified===false && !Object.hasOwn(r,'centerlineLengthIn')));
  assert.equal(result.notice,'NOT FOR FABRICATION');
  assert.equal(result.fabricationAuthorized,false);
});

test('same exact schematic match cannot become a physical or fabrication approval',async()=>{
  const prior=await evidence('r1',model()),next=await evidence('r2',model());
  const result=await tracePreliminaryMembers(prior,next,['fixed']);
  const row=result.members[0];
  assert.equal(row.relation,'SAME_SCHEMATIC_ENDPOINTS_ONLY');
  assert.equal(row.physicalContinuityVerified,false);
  assert.throws(()=>{row.physicalContinuityVerified=true;},TypeError);
  assert.throws(()=>row.nextEndJointIds.push('spoof'),TypeError);
  assert.throws(()=>{result.fabricationAuthorized=true;},TypeError);
});

test('fails closed on unknown or duplicate selections, stale revisions and independent evidence mismatches',async()=>{
  const prior=await evidence('r1',model()),next=await evidence('r2',model(true));
  for(const selection of [[],['fixed','fixed'],[' blank'],['unknown']])
    await assert.rejects(tracePreliminaryMembers(prior,next,selection),/member/i);
  await assert.rejects(tracePreliminaryMembers(prior,prior,['fixed']),/Distinct revisions/);
  await assert.rejects(tracePreliminaryMembers(prior,await evidence('r2',model(true),'other'),['fixed']),/different designs/);
  await assert.rejects(tracePreliminaryMembers(prior,{...next,traceabilityManifest:prior.traceabilityManifest},['fixed']),/does not match/);
  const substituted=await evidence('r2',model());
  await assert.rejects(tracePreliminaryMembers(prior,{...substituted,expected:next.expected},['fixed']),/source geometry/);
});
