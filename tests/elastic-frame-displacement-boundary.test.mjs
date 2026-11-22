import assert from 'node:assert/strict';
import test from 'node:test';
import { solveElasticFrame } from '../dist/analysis/src/elastic-frame-solve.js';
import { captureAuthoredCase } from '../dist/analysis/src/authored-case-replay.js';
import { replayAuthoredRelativeJointY } from '../dist/analysis/src/authored-serviceability-replay.js';

test('an exact interior member displacement is not a named modeled-joint observation',()=>{
 const result=solveElasticFrame({
  nodes:[{id:'A',xIn:0,yIn:0},{id:'C',xIn:120,yIn:0}],
  members:[{id:'AC',startNodeId:'A',endNodeId:'C',areaIn2:2,secondMomentIn4:12,elasticModulusPsi:1e6}],
  supports:[{nodeId:'A',fixX:true,fixY:true,fixRotation:true}],
  loads:[{nodeId:'C',fxLb:0,fyLb:-90,momentLbIn:0}],
  memberDisplacementStations:[{memberId:'AC',stationsIn:[60]}],
 });
 const [sample]=result.memberSectionDisplacements.AC;
 assert.equal(sample.stationIn,60);
 assert.ok(Math.abs(sample.transverseIn+90*60**2*(3*120-60)/(6*12e6))<1e-9);

 const scope={caseId:'down',description:'synthetic nodal load',modelId:'fixture',modelRevision:'r1'};
 const model={nodes:[{id:'A',x:0,y:0},{id:'B',x:60,y:60},{id:'C',x:120,y:0}],
  bars:[['A','B'],['B','C'],['A','C']].map(([a,b])=>({id:a+b,a,b,areaIn2:2,elasticModulusPsi:1e6})),
  supports:[{nodeId:'A',fixX:true,fixY:true},{nodeId:'C',fixX:false,fixY:true}],loads:[]};
 const channels=[{id:'authored',provenance:'fixture channel',loads:[{nodeId:'B',fyLb:-90}]}];
 const receipt=captureAuthoredCase(scope,model,channels);
 const expected={modelId:scope.modelId,modelRevision:scope.modelRevision,cases:[scope],
  datum:{nodeId:'B',leftBearingNodeId:'A',rightBearingNodeId:'C'}};
 const inputs=[{caseId:scope.caseId,channels,receipt}];
 const replay=replayAuthoredRelativeJointY(expected,model,inputs);
 assert.ok(replay.observations[0].relativeYIn<0);
 assert.notEqual(replay.observations[0].relativeYIn,sample.transverseIn);
 assert.equal(replay.codeDeflectionVerified,false);
 assert.equal(replay.manufacturingApproved,false);
 const sampleId=`AC@${sample.stationIn}`;
 assert.throws(()=>replayAuthoredRelativeJointY({...expected,datum:{...expected.datum,nodeId:sampleId}},model,inputs),
  /Unmodeled or invalid observation\/datum node: AC@60/u);
 assert.throws(()=>replayAuthoredRelativeJointY(expected,model,[{...inputs[0],receipt:sample}]),
  /Authored case receipt has stale or unrecognized scope/u);
});
