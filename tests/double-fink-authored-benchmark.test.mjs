import test from 'node:test';
import assert from 'node:assert/strict';
import { studyAuthoredDoubleFinkElasticFrameReactions as study } from '../dist/analysis/src/double-fink-authored-elastic-frame-study.js';

const top=['L','T1','T2','T3','T4','T5','T6','T7','E'];
const lower=['L','B1','B2','B3','B4','B5','B6','B7','E'];
const webs=[['T1','B1'],['T7','B7'],['T1','B2'],['T7','B6'],['T2','B2'],['T6','B6'],
  ['T2','B3'],['T6','B5'],['T2','B4'],['T6','B4'],['T3','B4'],['T5','B4'],['T4','B4']];
const incidence=top.slice(0,-1).flatMap((id,i)=>[
  ['top',id,top[i+1]],['bottom',lower[i],lower[i+1]],
]).concat(webs.map(([a,b])=>['web',a,b]));
const near=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-7,`${a} != ${b}`);
const vector=(row,[x,y,m])=>{
  near(row.fxLb,x); near(row.fyLb,y); near(row.momentLbIn,m);
};

test('Double Fink projected and true measures close signed asymmetric actions about the peak',()=>{
  const result=study({
    modelId:'synthetic-double-fink', modelRevision:'r1',
    roof:{family:'common',spanFt:40,pitchRisePer12:6},
    supports:[
      {nodeId:'L',fixX:true,fixY:true,fixRotation:false},
      {nodeId:'E',fixX:false,fixY:true,fixRotation:false},
    ],
    memberAssignments:incidence.map(([kind,startNodeId,endNodeId])=>({
      memberId:`${kind}-${startNodeId}-${endNodeId}`,startNodeId,endNodeId,
      areaIn2:8,secondMomentIn4:12,elasticModulusPsi:1.2e6,
      releaseStartRotation:false,releaseEndRotation:false,
    })),
    originNodeId:'T4',
    sources:[
      {caseId:'left',sourceRef:'synthetic ascending outer chord',loads:[],memberLoads:[
        {memberId:'top-L-T1',basis:'horizontal-projection',qxLbPerIn:1,qyLbPerIn:-2},
      ]},
      {caseId:'right',sourceRef:'synthetic descending outer chord',loads:[],memberLoads:[
        {memberId:'top-T7-E',basis:'member-length',qxLbPerIn:-2,qyLbPerIn:-1},
      ]},
    ],
    combinations:[{caseId:'combined',sourceRef:'synthetic asymmetric signed weights',
      terms:[{caseId:'left',factor:2},{caseId:'right',factor:-0.5}]}],
  });
  assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(result.fabricationAuthorized,false);
  assert.equal(result.frame.nodes.length,16);
  assert.equal(result.frame.members.length,29);
  const [row]=result.cases;
  assert.equal(row.originNodeId,'T4');
  assert.equal(row.appliedRows.length,2);
  const [leftAction,rightAction]=row.appliedRows;
  const s=Math.sqrt(5)/2;
  // Projected left measure 60; true right measure sqrt(60²+30²).
  // True centroids (30,15) and (450,15) relative to peak (240,120).
  near(leftAction.loadedMeasureIn,60);
  near(rightAction.loadedMeasureIn,60*s);
  near(leftAction.xFromOriginIn,-210); near(leftAction.yFromOriginIn,-105);
  near(rightAction.xFromOriginIn,210); near(rightAction.yFromOriginIn,-105);
  const fx=120+60*s, fy=-240+30*s, mPeak=63000+12600*s;
  // Independent moment about L is 2*(-4500) + (-0.5)*(-25200*s).
  const ryE=(9000-12600*s)/480, ryL=-fy-ryE;
  vector(row.applied,[fx,fy,mPeak]);
  vector(row.supportRows.find(r=>r.nodeId==='L'),[-fx,ryL,-240*ryL-120*fx]);
  vector(row.supportRows.find(r=>r.nodeId==='E'),[0,ryE,240*ryE]);
  vector(row.residual,[0,0,0]);
});
