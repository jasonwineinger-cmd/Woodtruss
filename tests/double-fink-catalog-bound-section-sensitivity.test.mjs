import assert from 'node:assert/strict';
import test from 'node:test';
import {reviewDoubleFinkCatalogBoundSectionSensitivity as review} from '../dist/lumber/src/double-fink-catalog-bound-section-sensitivity.js';
import {pairedFixture} from './helpers/double-fink-sensitivity-fixture.mjs';

const near=(actual,expected)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);

test('unselected stiffness changes selected catalog-bound demands by the hand spring-series ratio',()=>{
  const input=pairedFixture();
  // Independent rows can be authored in a different order without altering model identity.
  input.alternative.study.memberAssignments.reverse();
  const result=review(input);
  assert.equal(result.status,'DOUBLE_FINK_CATALOG_BOUND_SECTION_SENSITIVITY_REVIEW_ONLY',JSON.stringify(result.outstanding));
  assert.equal(result.baselineModelRevision,'baseline-r1');
  assert.equal(result.alternativeModelRevision,'alternative-r2');
  assert.equal(result.selectedMemberCount,1);
  assert.deepEqual(result.changedUnselectedMembers,[{memberId:'bottom-L-B1',startNodeId:'L',endNodeId:'B1',
    changedProperties:['elasticModulusPsi']}]);
  for(const key of ['allModelMembersVerified','sourceIndependentlyVerified','sourceBytesVerified','approvedForStructuralUse',
    'fabricationAuthorized','machineReleaseAuthorized']) assert.equal(result[key],false,key);
  assert.deepEqual(result.cases.map(row=>row.caseId),['forward','reverse']);
  // The extra horizontal support makes the all-pin graph indeterminate by one.
  // Removing that extra restraint, the unit E_x force goes through all eight bottom
  // bars only. Compatibility at E is equivalent to a one-bar left spring versus
  // seven identical right springs in series about B1: k:(k/7) then 2k:(k/7).
  // Therefore the right chain is in compression at -100/8 then -100/15.
  for(const [i,weight] of [1,-.5].entries()){
    const [member]=result.cases[i].memberCuts;
    assert.deepEqual([member.memberId,member.startNodeId,member.endNodeId],['bottom-B1-B2','B1','B2']);
    assert.deepEqual(member.cuts.map(({stationIn,side})=>[stationIn,side]),[[9,'continuous'],[24,'continuous']]);
    for(const {baseline,alternative,delta} of member.cuts){
      near(baseline.axialLb,-100/8*weight);
      near(alternative.axialLb,-100/15*weight);
      near(delta.axialLb,(100/8-100/15)*weight);
      for(const v of [baseline,alternative,delta]){
        near(v.shearLb,0); near(v.momentLbIn,0);
      }
    }
  }
});
