import assert from 'node:assert/strict';
import test from 'node:test';
import { generateDoubleFinkTopology } from '../dist/geometry/src/double-fink-topology.js';
import { reviewDoubleFinkCatalogBoundSectionDemands as review }
  from '../dist/lumber/src/double-fink-catalog-bound-section-review.js';

function fixture() {
  const roof={family:'common',spanFt:40,pitchRisePer12:4};
  const modelId='synthetic-frame',modelRevision='r4',catalogId='synthetic-catalog';
  const record={referenceValueId:'synthetic-ref',speciesGroup:'synthetic species',grade:'synthetic grade',
    nominalSize:'synthetic size',actualWidthIn:2,actualDepthIn:3,referenceEdition:'synthetic edition',
    referencePublisher:'synthetic publisher',referenceTable:'synthetic table',
    fbPsi:1,ftPsi:1,fcPsi:1,fvPsi:1,ePsi:1_234_567,eMinPsi:1_234_567};
  const memberAssignments=generateDoubleFinkTopology(roof).members.map(({id,start,end})=>({
    memberId:id,startNodeId:start,endNodeId:end,areaIn2:6,secondMomentIn4:4.5,
    elasticModulusPsi:record.ePsi,releaseStartRotation:false,releaseEndRotation:false,
  }));
  const supports=[{nodeId:'L',fixX:true,fixY:true,fixRotation:false},{nodeId:'E',fixX:false,fixY:true,fixRotation:false}];
  const sources=[{caseId:'fixture-load',sourceRef:'synthetic authored nodal load',
    loads:[{nodeId:'T4',fxLb:0,fyLb:-45,momentLbIn:0}]}];
  const combinations=['a','b'].map((caseId,i)=>({caseId,sourceRef:'synthetic authored combination',
    terms:[{caseId:'fixture-load',factor:i+1}]}));
  const selected=['bottom-L-B1','bottom-B1-B2'].map(id=>memberAssignments.find(row=>row.memberId===id));
  const direction=({memberId,startNodeId,endNodeId})=>({memberId,startNodeId,endNodeId});
  const caseCuts=combinations.map(({caseId},i)=>({caseId,memberCuts:[{
    ...direction(selected[i]),cuts:[{stationIn:12,side:'continuous'}],
  }]}));
  const study={roof,modelId,modelRevision,memberAssignments,supports,sources,combinations,caseCuts};
  const assignments=selected.map((member,i)=>({...direction(member),modelId,modelRevision,catalogId,
    referenceValueId:record.referenceValueId,bendingAxis:'about-width',modulusBasis:'catalog-mean',
    assignmentRecordId:'synthetic-assignment-'+i}));
  const expectedSources=assignments.map(({modulusBasis:_,...assignment})=>({...assignment,quantity:'E',
    publisher:record.referencePublisher,edition:record.referenceEdition,table:record.referenceTable,
    speciesGroup:record.speciesGroup,grade:record.grade,nominalSize:record.nominalSize,
    actualWidthIn:record.actualWidthIn,actualDepthIn:record.actualDepthIn,
    sourceRole:'nds-supplement',sourceArtifactId:'synthetic-supplement',sourceArtifactSha256:'a'.repeat(64),
  }));
  const receipts=expectedSources.map(source=>({...source,checkedValuePsi:record.ePsi}));
  return {study,catalog:{catalogId,records:[record]},assignments,expectedSources,receipts};
}

function noAuthority(result) {
  assert.equal(result.fabricationAuthorized,false);
  assert.ok(!Object.entries(result).some(([key,value])=> /approv|verified|authoriz|ndsReady/iu.test(key) && value===true));
  assert.doesNotMatch(JSON.stringify(result), /1234567|synthetic-supplement|a{64}|b{64}/u);
}

test('includes exact cases only with complete directed selected-member union and mean E evidence',()=>{
  const input=fixture();
  const result=review(input);
  assert.deepEqual(result.cases.map(row=>row.caseId),['a','b']);
  noAuthority(result);
});

test('holds missing union, exact-but-minimum E, wrong axis, endpoints, revision and source roles',()=>{
  for(const mutate of [
    i=>{i.assignments.pop();i.expectedSources.pop();i.receipts.pop();},
    i=>{i.assignments[0].modulusBasis='catalog-minimum';i.expectedSources[0].quantity=i.receipts[0].quantity='Emin';},
    i=>{i.assignments[0].bendingAxis=i.expectedSources[0].bendingAxis=i.receipts[0].bendingAxis='about-depth';},
    i=>{for(const row of [i.assignments[0],i.expectedSources[0],i.receipts[0]])
      [row.startNodeId,row.endNodeId]=[row.endNodeId,row.startNodeId];},
    i=>{i.study.modelRevision='stale';},
    i=>{i.receipts[0].sourceArtifactSha256='b'.repeat(64);},
    i=>{i.expectedSources[0].sourceRole=i.receipts[0].sourceRole='nds-standard';},
  ]){
    const input=fixture();
    mutate(input);
    const result=review(input);
    assert.deepEqual(result.cases,[],mutate.toString());
    noAuthority(result);
  }
});

test('holds fake case and solver output attempts without releasing other valid cases',()=>{
  for(const mutate of [
    i=>{i.study.caseCuts.reverse();},
    i=>{i.study.caseCuts[1].memberCuts[0].cuts[0].momentLbIn=500;},
    i=>{i.study.memberSectionDemand={};},
    i=>{i.fabricationAuthorized=true;},
  ]){
    const input=fixture();
    mutate(input);
    const result=review(input);
    assert.deepEqual(result.cases,[],mutate.toString());
    noAuthority(result);
  }
});
