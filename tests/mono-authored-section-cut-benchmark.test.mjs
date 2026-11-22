import test from 'node:test';
import assert from 'node:assert/strict';
import { studyAuthoredMonoElasticFrameSectionCuts as study }
  from '../dist/analysis/src/mono-authored-elastic-frame-section-cuts.js';

const incidence = [
  ['top-L-T1','L','T1'], ['bottom-L-B1','L','B1'], ['web-T1-B1','T1','B1'],
  ['top-T1-T2','T1','T2'], ['bottom-B1-B2','B1','B2'], ['web-T2-B2','T2','B2'], ['web-T1-B2','T1','B2'],
  ['top-T2-T3','T2','T3'], ['bottom-B2-B3','B2','B3'], ['web-T3-B3','T3','B3'], ['web-T2-B3','T2','B3'],
  ['top-T3-T4','T3','T4'], ['bottom-B3-E','B3','E'], ['web-T4-E','T4','E'], ['web-T3-E','T3','E'],
];

const near = (actual, expected) => assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) < 1e-8,
  `${actual} does not match hand-equilibrium cut action ${expected}`);

test('directed mono high-web cuts retain exact point sides, signs and cancelled zero jump', () => {
  const cuts = [
    {stationIn:120,side:'continuous'}, {stationIn:60,side:'right'}, {stationIn:0,side:'continuous'},
    {stationIn:60,side:'left'}, {stationIn:35.5,side:'continuous'}, {stationIn:98.25,side:'continuous'},
  ];
  const result = study({
    modelId:'synthetic-mono-cut', modelRevision:'r1',
    roof:{family:'mono',spanFt:20,pitchRisePer12:6},
    memberAssignments:incidence.map(([memberId,startNodeId,endNodeId])=>({
      memberId,startNodeId,endNodeId,areaIn2:8,secondMomentIn4:12,elasticModulusPsi:1.2e6,
      releaseStartRotation:true,releaseEndRotation:true,
    })),
    supports:[
      {nodeId:'L',fixX:true,fixY:true,fixRotation:false},
      {nodeId:'E',fixX:false,fixY:true,fixRotation:false},
    ],
    sources:[
      {caseId:'point',sourceRef:'synthetic downward action',loads:[],
        memberPointLoads:[{memberId:'web-T4-E',stationIn:60,fxLb:0,fyLb:-400}]},
      {caseId:'counterpoint',sourceRef:'synthetic opposite action',loads:[],
        memberPointLoads:[{memberId:'web-T4-E',stationIn:60,fxLb:0,fyLb:400}]},
      {caseId:'transverse',sourceRef:'synthetic transverse point action',loads:[],
        memberPointLoads:[{memberId:'web-T4-E',stationIn:60,fxLb:400,fyLb:0}]},
      {caseId:'bearing',sourceRef:'synthetic action at bearing',loads:[{nodeId:'E',fxLb:0,fyLb:-25,momentLbIn:0}]},
    ],
    combinations:[
      {caseId:'down',sourceRef:'positive authored factor',terms:[{caseId:'point',factor:1}]},
      {caseId:'up',sourceRef:'negative authored factor',terms:[{caseId:'point',factor:-.5}]},
      {caseId:'cancel',sourceRef:'two coincident authored opposite forces plus separate nodal action',
        terms:[{caseId:'point',factor:1},{caseId:'counterpoint',factor:1},{caseId:'bearing',factor:1}]},
      {caseId:'cross',sourceRef:'synthetic transverse combination',terms:[{caseId:'transverse',factor:1}]},
    ],
    caseCuts:['down','up','cancel','cross'].map(caseId=>({caseId,
      memberCuts:[{memberId:'web-T4-E',startNodeId:'T4',endNodeId:'E',cuts}]})),
  });
  assert.equal(result.fabricationAuthorized,false);
  assert.deepEqual(result.cases.map(row=>row.caseId),['down','up','cancel','cross']);
  for (const [index,after] of [-400,200,0].entries()) {
    const [web] = result.cases[index].memberCuts;
    assert.deepEqual([web.memberId,web.startNodeId,web.endNodeId],['web-T4-E','T4','E']);
    assert.deepEqual(web.cuts.map(({stationIn,side})=>({stationIn,side})),cuts);
    // Along this unloaded high-low vertical axis the applied point force
    // passes to E; T4 above it is unloaded. Tension is positive.
    for (const [i,expectedAxial] of [after,after,0,0,0,after].entries()) {
      near(web.cuts[i].axialLb,expectedAxial);
      near(web.cuts[i].shearLb,0);
      near(web.cuts[i].momentLbIn,0);
    }
  }
  const transverse = result.cases[3].memberCuts[0].cuts;
  assert.deepEqual(transverse.map(({stationIn,side})=>({stationIn,side})),cuts);
  // Pin-ended local web has −200 lb end shear actions. The surrounding
  // slope sends 100 lb of compression down the web under the lateral force.
  for (const [i,shear,moment] of [[0,-200,0],[1,-200,-12000],[2,200,0],
      [3,200,-12000],[4,200,-7100],[5,-200,-4350]]) {
    near(transverse[i].axialLb,-100);
    near(transverse[i].shearLb,shear);
    near(transverse[i].momentLbIn,moment);
  }
});
