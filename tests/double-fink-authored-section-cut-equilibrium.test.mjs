import test from 'node:test';
import assert from 'node:assert/strict';
import { studyAuthoredDoubleFinkElasticFrameSectionCuts as study }
  from '../dist/analysis/src/double-fink-authored-elastic-frame-section-cuts.js';

test('Double Fink co-located outer chord cuts close the same left free body for two load signs', () => {
  const top = ['L','T1','T2','T3','T4','T5','T6','T7','E'];
  const bottom = ['L','B1','B2','B3','B4','B5','B6','B7','E'];
  const edges = top.slice(0,-1).flatMap((start,i) => [
    ['top',start,top[i+1]], ['bottom',bottom[i],bottom[i+1]],
  ]).concat([
    ['T1','B1'],['T7','B7'],['T1','B2'],['T7','B6'],['T2','B2'],['T6','B6'],
    ['T2','B3'],['T6','B5'],['T2','B4'],['T6','B4'],['T3','B4'],['T5','B4'],['T4','B4'],
  ].map(([start,end]) => ['web',start,end]));
  const root5 = Math.sqrt(5);
  const selections = [
    {memberId:'top-L-T1',startNodeId:'L',endNodeId:'T1',cuts:[{stationIn:15*root5,side:'continuous'}]},
    {memberId:'bottom-L-B1',startNodeId:'L',endNodeId:'B1',cuts:[{stationIn:30,side:'continuous'}]},
  ];
  const cases = [['gravity-and-lateral',1],['sign-reversal',-.5]];
  const result = study({
    modelId:'synthetic-double-fink-section-closure',modelRevision:'r1',
    roof:{family:'common',spanFt:40,pitchRisePer12:6},
    memberAssignments:edges.map(([kind,startNodeId,endNodeId]) => ({
      memberId:kind+'-'+startNodeId+'-'+endNodeId,startNodeId,endNodeId,
      areaIn2:8,secondMomentIn4:12,elasticModulusPsi:1.2e6,
      releaseStartRotation:true,releaseEndRotation:true,
    })),
    supports:[
      {nodeId:'L',fixX:true,fixY:true,fixRotation:false},
      {nodeId:'E',fixX:false,fixY:true,fixRotation:false},
    ],
    sources:[{caseId:'apex',sourceRef:'synthetic signed apex vector',
      loads:[{nodeId:'T4',fxLb:100,fyLb:-480,momentLbIn:0}]}],
    combinations:cases.map(([caseId,factor])=>({caseId,sourceRef:'explicit factor',terms:[{caseId:'apex',factor}]})),
    caseCuts:cases.map(([caseId])=>({caseId,memberCuts:selections})),
  });
  const near = (a,b) => assert.ok(Number.isFinite(a) && Math.abs(a-b) < 1e-8, `${a} != ${b}`);
  assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(result.fabricationAuthorized,false);
  assert.deepEqual(result.cases.map(r=>r.caseId),cases.map(([caseId])=>caseId));
  for (const [i, [,factor]] of cases.entries()) {
    const [upper,lower] = result.cases[i].memberCuts.map(row=>row.cuts[0]);
    // From global statics, moment about L gives R_E = (480*240 + 100*120)/480 = 265 lb.
    // The unladen two-member cut at x=30 has only left support (-100,+215) behind it.
    const cutUpperX = upper.axialLb*2/root5, cutUpperY = upper.axialLb/root5;
    near(-100*factor + cutUpperX + lower.axialLb,0);
    near(215*factor + cutUpperY,0);
    near(30*cutUpperY - 15*cutUpperX,0);
    for (const {shearLb,momentLbIn} of [upper,lower]) {
      near(shearLb,0);
      near(momentLbIn,0);
    }
  }
});
