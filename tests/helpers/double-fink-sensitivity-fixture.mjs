const top=['L','T1','T2','T3','T4','T5','T6','T7','E'];
const lower=['L','B1','B2','B3','B4','B5','B6','B7','E'];
const webs=[['T1','B1'],['T7','B7'],['T1','B2'],['T7','B6'],['T2','B2'],['T6','B6'],
  ['T2','B3'],['T6','B5'],['T2','B4'],['T6','B4'],['T3','B4'],['T5','B4'],['T4','B4']];
const incidence=top.slice(0,-1).flatMap((node,i)=>[
  ['top',node,top[i+1]],['bottom',lower[i],lower[i+1]],
]).concat(webs.map(([a,b])=>['web',a,b]));

export function pairedFixture(){
  const modelId='synthetic-double-fink-sensitivity',catalogId='synthetic-catalog',referenceValueId='synthetic-reference';
  const memberId='bottom-B1-B2',startNodeId='B1',endNodeId='B2',assignmentRecordId='synthetic-assignment';
  const row={referenceValueId,speciesGroup:'synthetic-group',grade:'synthetic-grade',nominalSize:'synthetic-size',
    actualWidthIn:2,actualDepthIn:6,referenceEdition:'fixture-edition',referencePublisher:'fixture-publisher',referenceTable:'fixture-table',
    fbPsi:11,ftPsi:12,fcPsi:13,fvPsi:14,ePsi:1_000_000,eMinPsi:250_000};
  const source={assignmentRecordId,modelId,modelRevision:'baseline-r1',memberId,startNodeId,endNodeId,bendingAxis:'about-width',catalogId,referenceValueId,quantity:'E',publisher:row.referencePublisher,
    edition:row.referenceEdition,table:row.referenceTable,speciesGroup:row.speciesGroup,grade:row.grade,
    nominalSize:row.nominalSize,actualWidthIn:2,actualDepthIn:6,sourceRole:'nds-supplement',
    sourceArtifactId:'fixture-document',sourceArtifactSha256:'ab'.repeat(32)};
  const baseline={
    study:{modelId,modelRevision:'baseline-r1',roof:{family:'common',spanFt:20,pitchRisePer12:6},
      supports:['L','E'].map(nodeId=>({nodeId,fixX:true,fixY:true,fixRotation:false})),
      memberAssignments:incidence.map(([kind,a,b])=>({memberId:`${kind}-${a}-${b}`,startNodeId:a,endNodeId:b,
        areaIn2:12,secondMomentIn4:36,elasticModulusPsi:1_000_000,releaseStartRotation:true,releaseEndRotation:true})),
      sources:[{caseId:'point',sourceRef:'synthetic B1 horizontal force',
        loads:[{nodeId:'B1',fxLb:100,fyLb:0,momentLbIn:0}]}],
      combinations:[{caseId:'forward',sourceRef:'synthetic unit',terms:[{caseId:'point',factor:1}]},
        {caseId:'reverse',sourceRef:'synthetic reverse half',terms:[{caseId:'point',factor:-.5}]}],
      caseCuts:['forward','reverse'].map(caseId=>({caseId,memberCuts:[{memberId,startNodeId,endNodeId,
        cuts:[{stationIn:9,side:'continuous'},{stationIn:24,side:'continuous'}]}]})),
    },
    catalog:{catalogId,records:[row]},
    assignments:[{modelId,modelRevision:'baseline-r1',memberId,startNodeId,endNodeId,catalogId,referenceValueId,
      bendingAxis:'about-width',modulusBasis:'catalog-mean',assignmentRecordId}],
    expectedSources:[source],
    receipts:[{...source,checkedValuePsi:row.ePsi}],
  };
  const alternative=structuredClone(baseline);
  alternative.study.modelRevision=alternative.assignments[0].modelRevision=
    alternative.expectedSources[0].modelRevision=alternative.receipts[0].modelRevision='alternative-r2';
  alternative.study.memberAssignments.find(row=>row.memberId==='bottom-L-B1').elasticModulusPsi*=2;
  return {baseline,alternative};
}
