import test from 'node:test';
import assert from 'node:assert/strict';
import { studyAuthoredDoubleFinkElasticFrameJointBalance as study }
  from '../dist/analysis/src/double-fink-authored-elastic-frame-joint-balance.js';

const near = (a,b) => assert.ok(Number.isFinite(a) && Math.abs(a-b) < 1e-7, `${a} != ${b}`);
const vector = (v,expected) => [v.fxLb,v.fyLb,v.momentLbIn].forEach((value,i)=>near(value,expected[i]));
const sum = incident => ({
  fxLb:incident.reduce((s,r)=>s+r.fxLb,0),
  fyLb:incident.reduce((s,r)=>s+r.fyLb,0),
  momentLbIn:incident.reduce((s,r)=>s+r.momentLbIn,0),
});

test('ordinary Double Fink near and far end actions balance a true nodal moment and pin/roller bearings', () => {
  const top = ['L','T1','T2','T3','T4','T5','T6','T7','E'];
  const bottom = ['L','B1','B2','B3','B4','B5','B6','B7','E'];
  const edges = top.slice(0,-1).flatMap((start,i) => [
    ['top',start,top[i+1]], ['bottom',bottom[i],bottom[i+1]],
  ]).concat([
    ['T1','B1'],['T7','B7'],['T1','B2'],['T7','B6'],['T2','B2'],['T6','B6'],
    ['T2','B3'],['T6','B5'],['T2','B4'],['T6','B4'],['T3','B4'],['T5','B4'],['T4','B4'],
  ].map(([start,end]) => ['web',start,end]));
  const result = study({
    modelId:'synthetic-double-fink-joints',modelRevision:'r1',
    roof:{family:'common',spanFt:40,pitchRisePer12:6},
    memberAssignments:edges.map(([kind,startNodeId,endNodeId]) => ({
      memberId:kind+'-'+startNodeId+'-'+endNodeId,startNodeId,endNodeId,
      areaIn2:8,secondMomentIn4:12,elasticModulusPsi:1.2e6,
      releaseStartRotation:false,releaseEndRotation:false,
    })),
    supports:[
      {nodeId:'L',fixX:true,fixY:true,fixRotation:false},
      {nodeId:'E',fixX:false,fixY:true,fixRotation:false},
    ],
    sources:[{caseId:'apex',sourceRef:'synthetic forces and ccw couple',
      loads:[{nodeId:'T4',fxLb:100,fyLb:-480,momentLbIn:9600}]}],
    combinations:[{caseId:'check',sourceRef:'explicit synthetic case',terms:[{caseId:'apex',factor:1}]}],
    caseJoints:[{caseId:'check',nodeIds:['T4','E','L']}],
  });
  assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(result.fabricationAuthorized,false);
  const [crest,right,left] = result.cases[0].joints;
  assert.deepEqual([crest.nodeId,right.nodeId,left.nodeId],['T4','E','L']);
  assert.deepEqual(crest.incident.map(r=>[r.memberId,r.at]).sort(),[
    ['top-T3-T4','end'],['top-T4-T5','start'],['web-T4-B4','start'],
  ]);
  // Whole-frame moments about the left bearing: R_E*480 - 480*240 - 100*120 + 9600 = 0.
  // Then force balance yields left bearing (-100,+235). No bearing resists moment.
  const expect = [
    [crest,[100,-480,9600],[0,0,0],[-100,480,-9600]],
    [right,[0,0,0],[0,245,0],[0,-245,0]],
    [left,[0,0,0],[-100,235,0],[100,-235,0]],
  ];
  for (const [joint,applied,support,internal] of expect) {
    vector(joint.applied,applied);
    vector(joint.support,support);
    vector(sum(joint.incident),internal);
    vector(joint.residual,[0,0,0]);
  }
});
