import test from 'node:test';
import assert from 'node:assert/strict';
import { studyAuthoredRaisedHeelDoubleFinkElasticFrameReactions as study } from '../dist/analysis/src/raised-heel-double-fink-authored-elastic-frame-study.js';

const top=['HL','T1','T2','T3','T4','T5','T6','T7','HE'];
const bottom=['L','B1','B2','B3','B4','B5','B6','B7','E'];
const webs=[
  ['T1','B1'],['T7','B7'],['T1','B2'],['T7','B6'],['T2','B2'],['T6','B6'],
  ['T2','B3'],['T6','B5'],['T2','B4'],['T6','B4'],['T3','B4'],['T5','B4'],['T4','B4'],
  ['L','HL'],['HL','B1'],['B7','HE'],['HE','E'],
];
const incidence=top.slice(0,-1).flatMap((id,i)=>[
  ['top',id,top[i+1]],['bottom',bottom[i],bottom[i+1]],
]).concat(webs.map(([a,b])=>['web',a,b]));
const near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-7,`${a} != ${b}`);
const vector=(row,[x,y,m])=>{
  near(row.fxLb,x);near(row.fyLb,y);near(row.momentLbIn,m);
};
const source=(caseId,nodeId,fxLb,fyLb)=>({
  caseId,sourceRef:'synthetic joint action',loads:[{nodeId,fxLb,fyLb,momentLbIn:0}],
});
const combo=(caseId,left,right)=>({caseId,sourceRef:'explicit signed weights',terms:[
  {caseId:left,factor:2},{caseId:right,factor:-0.5},{caseId:'vertical',factor:1.5},
]});

test('raised-heel Double Fink retains moments of opposing heel actions about an elevated named node',()=>{
  const result=study({
    modelId:'synthetic-raised-double-fink',modelRevision:'r1',
    roof:{family:'common',spanFt:40,pitchRisePer12:4,heelHeightIn:12},
    supports:[{nodeId:'L',fixX:true,fixY:true,fixRotation:false},
      {nodeId:'E',fixX:false,fixY:true,fixRotation:false}],
    memberAssignments:incidence.map(([kind,startNodeId,endNodeId])=>({
      memberId:`${kind}-${startNodeId}-${endNodeId}`,startNodeId,endNodeId,
      areaIn2:8,secondMomentIn4:12,elasticModulusPsi:1.2e6,
      releaseStartRotation:false,releaseEndRotation:false,
    })),
    originNodeId:'T3',
    sources:[
      source('left-heel','HL',100,0),source('right-heel','HE',60,0),
      source('left-bearing','L',100,0),source('right-bearing','E',60,0),
      source('vertical','T6',0,-120),
    ],
    combinations:[combo('heels','left-heel','right-heel'),combo('bearings','left-bearing','right-bearing')],
  });
  assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(result.fabricationAuthorized,false);
  assert.equal(result.frame.nodes.length,18);
  assert.equal(result.frame.members.length,33);
  const nodes=Object.fromEntries(result.frame.nodes.map(n=>[n.id,[n.xIn,n.yIn]]));
  for(const [id,xy] of Object.entries({L:[0,0],HL:[0,12],E:[480,0],HE:[480,12],T3:[180,72],T6:[360,52]}))
    assert.deepEqual(nodes[id],xy);
  assert.deepEqual(result.cases.map(row=>row.caseId),['heels','bearings']);
  // Applied +200 and -30 act 60 in below T3 at the raised heels; moving
  // them to the bearings puts both 72 in below T3. The -180 vertical
  // action at T6 adds -180*180 lb-in about T3 in both cases.
  // Independently about L, E_y*480 = 180*360 + (200-30)*12
  // for the heel case, and 180*360 for the bearing case.
  const oracle=[
    [[170,-180,-22200],[-170,40.75,-19575],[0,139.25,41775]],
    [[170,-180,-20160],[-170,45,-20340],[0,135,40500]],
  ];
  for(const [i,row] of result.cases.entries()){
    const [applied,left,right]=oracle[i];
    assert.equal(row.originNodeId,'T3');
    vector(row.applied,applied);
    vector(row.supportRows.find(r=>r.nodeId==='L'),left);
    vector(row.supportRows.find(r=>r.nodeId==='E'),right);
    vector(row.residual,[0,0,0]);
  }
});
