import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewDoubleFinkCatalogBoundSectionDemands as review } from '../dist/lumber/src/double-fink-catalog-bound-section-review.js';

const top=['L','T1','T2','T3','T4','T5','T6','T7','E'];
const lower=['L','B1','B2','B3','B4','B5','B6','B7','E'];
const webs=[['T1','B1'],['T7','B7'],['T1','B2'],['T7','B6'],['T2','B2'],['T6','B6'],
  ['T2','B3'],['T6','B5'],['T2','B4'],['T6','B4'],['T3','B4'],['T5','B4'],['T4','B4']];
const incidence=top.slice(0,-1).flatMap((id,i)=>[
  ['top',id,top[i+1]],['bottom',lower[i],lower[i+1]],
]).concat(webs.map(([a,b])=>['web',a,b]));
const near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('one exact mean-modulus receipt binds a directed section across signed cases without changing the cut vector',()=>{
  const modelId='synthetic-catalog-double-fink',modelRevision='r2';
  const catalogId='fixture-only',referenceValueId='fixture-row',memberId='bottom-B1-B2';
  const row={referenceValueId,speciesGroup:'synthetic-group',grade:'synthetic-grade',nominalSize:'synthetic-size',
    actualWidthIn:2,actualDepthIn:6,referenceEdition:'2024',referencePublisher:'synthetic fixture',referenceTable:'fixture source row',
    fbPsi:1,ftPsi:1,fcPsi:1,fvPsi:1,ePsi:1_000_000,eMinPsi:250_000};
  const assignments=[{modelId,modelRevision,memberId,startNodeId:'B1',endNodeId:'B2',catalogId,referenceValueId,
    bendingAxis:'about-width',modulusBasis:'catalog-mean',assignmentRecordId:'synthetic-document-receipt'}];
  const {modulusBasis:discarded,...assignment}=assignments[0];
  const source={...assignment,quantity:'E',publisher:row.referencePublisher,edition:row.referenceEdition,table:row.referenceTable,
    speciesGroup:row.speciesGroup,grade:row.grade,nominalSize:row.nominalSize,
    actualWidthIn:row.actualWidthIn,actualDepthIn:row.actualDepthIn,
    sourceRole:'nds-supplement',sourceArtifactId:'synthetic-document',sourceArtifactSha256:'ab'.repeat(32)};
  const cuts=[{stationIn:7.5,side:'right'},{stationIn:7.5,side:'left'},{stationIn:23,side:'continuous'}];
  const study={
    modelId,modelRevision,roof:{family:'common',spanFt:20,pitchRisePer12:6},
    supports:[{nodeId:'L',fixX:true,fixY:true,fixRotation:false},
      {nodeId:'E',fixX:false,fixY:true,fixRotation:false}],
    memberAssignments:incidence.map(([kind,startNodeId,endNodeId])=>({
      memberId:`${kind}-${startNodeId}-${endNodeId}`,startNodeId,endNodeId,
      areaIn2:12,secondMomentIn4:36,elasticModulusPsi:1_000_000,
      releaseStartRotation:true,releaseEndRotation:true,
    })),
    sources:[{caseId:'point',sourceRef:'synthetic off-center chord load',
      loads:[{nodeId:'B1',fxLb:-36,fyLb:180,momentLbIn:0},{nodeId:'B2',fxLb:-12,fyLb:60,momentLbIn:0}],
      memberPointLoads:[{memberId,stationIn:7.5,fxLb:48,fyLb:-240}]}],
    combinations:[
      {caseId:'forward',sourceRef:'explicit unit factor',terms:[{caseId:'point',factor:1}]},
      {caseId:'reverse',sourceRef:'explicit reversal',terms:[{caseId:'point',factor:-.5}]},
    ],
    caseCuts:['forward','reverse'].map(caseId=>({caseId,
      memberCuts:[{memberId,startNodeId:'B1',endNodeId:'B2',cuts}]})),
  };
  const result=review({study,catalog:{catalogId,records:[row]},assignments,
    expectedSources:[source],receipts:[{...source,checkedValuePsi:row.ePsi}]});
  assert.equal(result.status,'DOUBLE_FINK_CATALOG_BOUND_SECTION_REVIEW_ONLY',JSON.stringify(result.outstanding));
  assert.equal(result.selectedMemberCount,1);
  assert.equal(result.fabricationAuthorized,false);
  assert.deepEqual(result.cases.map(row=>row.caseId),['forward','reverse']);
  // Isolated 30-in prismatic released segment: vertical end reactions
  // 240*(22.5/30,7.5/30)=(180,60). Explicit nodal counterparts
  // cancel its assembled loads so axial compatibility divides +48
  // between ends in the same ratios. Opposite point sides differ by
  // -48 lb axial and +240 lb shear but have continuous bending moment.
  const hand=[[-12,60,1350],[36,-180,1350],[-12,60,420]];
  for(const [index,factor] of [1,-.5].entries()){
    const [member]=result.cases[index].memberCuts;
    assert.deepEqual([member.memberId,member.startNodeId,member.endNodeId],[memberId,'B1','B2']);
    assert.deepEqual(member.cuts.map(({stationIn,side})=>({stationIn,side})),cuts);
    member.cuts.forEach(({axialLb,shearLb,momentLbIn},j)=>{
      near(axialLb,hand[j][0]*factor); near(shearLb,hand[j][1]*factor); near(momentLbIn,hand[j][2]*factor);
    });
  }
});
