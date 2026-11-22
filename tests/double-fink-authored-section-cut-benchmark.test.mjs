import test from 'node:test';
import assert from 'node:assert/strict';
import { studyAuthoredDoubleFinkElasticFrameSectionCuts as study } from '../dist/analysis/src/double-fink-authored-elastic-frame-section-cuts.js';

const top=['L','T1','T2','T3','T4','T5','T6','T7','E'];
const lower=['L','B1','B2','B3','B4','B5','B6','B7','E'];
const webs=[['T1','B1'],['T7','B7'],['T1','B2'],['T7','B6'],['T2','B2'],['T6','B6'],
  ['T2','B3'],['T6','B5'],['T2','B4'],['T6','B4'],['T3','B4'],['T5','B4'],['T4','B4']];
const incidence=top.slice(0,-1).flatMap((id,i)=>[
  ['top',id,top[i+1]],['bottom',lower[i],lower[i+1]],
]).concat(webs.map(([a,b])=>['web',a,b]));
const near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('Double Fink cut receipts match hand-equilibrated tension, shear and bending on both sides', () => {
  const cuts = [
    {stationIn:30,side:'continuous'}, {stationIn:11.25,side:'right'},
    {stationIn:5,side:'continuous'}, {stationIn:11.25,side:'left'},
    {stationIn:23,side:'continuous'}, {stationIn:0,side:'continuous'},
  ];
  const result = study({
    modelId:'synthetic-double-fink-cut', modelRevision:'r1',
    roof:{family:'common',spanFt:20,pitchRisePer12:6},
    supports:[
      {nodeId:'L',fixX:true,fixY:true,fixRotation:false},
      {nodeId:'E',fixX:false,fixY:true,fixRotation:false},
    ],
    memberAssignments:incidence.map(([kind,startNodeId,endNodeId])=>({
      memberId:`${kind}-${startNodeId}-${endNodeId}`,startNodeId,endNodeId,
      areaIn2:8,secondMomentIn4:12,elasticModulusPsi:1.2e6,
      releaseStartRotation:true,releaseEndRotation:true,
    })),
    sources:[{
      caseId:'point',sourceRef:'synthetic isolated chord action',
      loads:[
        {nodeId:'B1',fxLb:-50,fyLb:200,momentLbIn:0},
        {nodeId:'B2',fxLb:-30,fyLb:120,momentLbIn:0},
      ],
      memberPointLoads:[{memberId:'bottom-B1-B2',stationIn:11.25,fxLb:80,fyLb:-320}],
    }],
    combinations:[
      {caseId:'down',sourceRef:'explicit signed factor',terms:[{caseId:'point',factor:1}]},
      {caseId:'reversed',sourceRef:'explicit opposed factor',terms:[{caseId:'point',factor:-.5}]},
    ],
    caseCuts:['down','reversed'].map(caseId=>({caseId,
      memberCuts:[{memberId:'bottom-B1-B2',startNodeId:'B1',endNodeId:'B2',cuts}]})),
  });
  assert.equal(result.family,'common');
  assert.equal(result.subtype,'symmetric-double-fink-reference');
  assert.equal(result.fabricationAuthorized,false);
  assert.deepEqual(result.cases.map(row=>row.caseId),['down','reversed']);

  // The chord is the horizontal 30-in bay from B1 to B2, with both rotations
  // released. Lever-arm ratios 18.75/30 and 11.25/30 split the vertical
  // 320 lb into +200/+120 lb. Equal opposing nodal forces cancel that
  // load on the global frame; there is no global displacement. Thus the
  // axial +80 lb point force divides -50/-30 lb into the end actions by
  // the same ratios (compatibility of two prismatic lengths at fixed axial
  // endpoints). The axial jump is -80, shear jump +320, and M is continuous.
  const oracle = [[-30,120,0],[-30,120,2250],[50,-200,1000],[50,-200,2250],[-30,120,840],[50,-200,0]];
  for (const [i,factor] of [1,-.5].entries()) {
    assert.equal(result.cases[i].memberCuts.length,1);
    const [row] = result.cases[i].memberCuts;
    assert.deepEqual([row.memberId,row.startNodeId,row.endNodeId],['bottom-B1-B2','B1','B2']);
    assert.deepEqual(row.cuts.map(({stationIn,side})=>({stationIn,side})),cuts);
    row.cuts.forEach(({axialLb,shearLb,momentLbIn},k)=>{
      near(axialLb,oracle[k][0]*factor);
      near(shearLb,oracle[k][1]*factor);
      near(momentLbIn,oracle[k][2]*factor);
    });
  }
});
