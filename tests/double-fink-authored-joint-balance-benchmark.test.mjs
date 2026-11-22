import test from 'node:test';
import assert from 'node:assert/strict';
import { studyAuthoredDoubleFinkElasticFrameJointBalance as study } from '../dist/analysis/src/double-fink-authored-elastic-frame-joint-balance.js';

const top=['L','T1','T2','T3','T4','T5','T6','T7','E'];
const lower=['L','B1','B2','B3','B4','B5','B6','B7','E'];
const webs=[['T1','B1'],['T7','B7'],['T1','B2'],['T7','B6'],['T2','B2'],['T6','B6'],
  ['T2','B3'],['T6','B5'],['T2','B4'],['T6','B4'],['T3','B4'],['T5','B4'],['T4','B4']];
const incidence=top.slice(0,-1).flatMap((id,i)=>[
  ['top',id,top[i+1]],['bottom',lower[i],lower[i+1]],
]).concat(webs.map(([a,b])=>['web',a,b]));
const near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-7,`${a} != ${b}`);

const vector = (row, x, y=0, moment=0) => {
  near(row.fxLb,x); near(row.fyLb,y); near(row.momentLbIn,moment);
};

test('Double Fink exact joint ledger balances a released upright transverse action without double counting it', () => {
  const result = study({
    modelId:'synthetic-double-fink-joint',modelRevision:'r1',
    roof:{family:'common',spanFt:40,pitchRisePer12:6},
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
      caseId:'point',sourceRef:'synthetic upright web action',
      loads:[
        {nodeId:'T4',fxLb:-120,fyLb:0,momentLbIn:0},
        {nodeId:'B4',fxLb:-40,fyLb:0,momentLbIn:0},
      ],
      memberPointLoads:[{memberId:'web-T4-B4',stationIn:30,fxLb:160,fyLb:0}],
    }],
    combinations:[
      {caseId:'forward',sourceRef:'explicit unit factor',terms:[{caseId:'point',factor:1}]},
      {caseId:'reverse',sourceRef:'explicit signed reversal',terms:[{caseId:'point',factor:-.5}]},
    ],
    caseJoints:['forward','reverse'].map(caseId=>({caseId,nodeIds:['B4','T4']})),
  });
  assert.equal(result.family,'common');
  assert.equal(result.subtype,'symmetric-double-fink-reference');
  assert.equal(result.fabricationAuthorized,false);
  assert.deepEqual(result.cases.map(row=>row.caseId),['forward','reverse']);
  // T4→B4 is an upright 120-in released web. Moment equilibrium gives
  // 160*30/120=40 lb to the bottom node, with the other 120 lb to the top.
  // Explicit opposing nodal forces prevent frame translation. The member
  // load comes through the incident end actions, not a second applied row.
  for (const [index,factor] of [1,-.5].entries()) {
    const {joints} = result.cases[index];
    assert.deepEqual(joints.map(joint=>joint.nodeId),['B4','T4']);
    for (const [i,endForce] of [40,120].entries()) {
      const joint = joints[i];
      const attached=joint.incident.find(row=>row.memberId==='web-T4-B4');
      assert.deepEqual([attached.startNodeId,attached.endNodeId,attached.at],['T4','B4',i===0?'end':'start']);
      vector(attached,endForce*factor);
      assert.ok(joint.incident.length>1);
      for(const other of joint.incident.filter(row=>row!==attached)) vector(other,0);
      vector(joint.applied,-endForce*factor);
      vector(joint.support,0);
      vector(joint.residual,0);
    }
  }
});
