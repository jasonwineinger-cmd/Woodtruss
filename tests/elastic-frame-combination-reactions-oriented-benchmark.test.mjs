import test from 'node:test';
import assert from 'node:assert/strict';
import {studyAuthoredElasticFrameCombinationReactions as study} from '../dist/analysis/src/elastic-frame-authored-combination-reactions.js';

const near=(actual,expected,tolerance=1e-8)=>assert.ok(
  Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance,
  `${actual} is not ${expected} within ${tolerance}`,
);

test('weighted reactions obey an inclined constraint and are invariant under a large representable coordinate translation',()=>{
  // Length 40 in; a force at J, 12 in from A. The weighted pair is
  // (+24,-32) lb and +16 lb-in. At A the loads have moment -368 lb-in,
  // so B_y=9.2 lb. A roller with tangent (3,4) needs B_x=-4/3 B_y.
  // About J, the applied moment is the direct +16 lb-in only.
  let first;
  for(const offset of [0,2**42]){
    const r=study({
      modelId:'oriented-scope', modelRevision:'v1', originNodeId:'J',
      frame:{
        nodes:[{id:'A',xIn:offset,yIn:offset},{id:'J',xIn:offset+12,yIn:offset},
          {id:'B',xIn:offset+40,yIn:offset}],
        members:[{id:'AJ',startNodeId:'A',endNodeId:'J',areaIn2:4,secondMomentIn4:24,elasticModulusPsi:1e6},
          {id:'JB',startNodeId:'J',endNodeId:'B',areaIn2:4,secondMomentIn4:24,elasticModulusPsi:1e6}],
        supports:[{nodeId:'B',freeDx:3,freeDy:4,fixRotation:false},
          {nodeId:'A',fixX:true,fixY:true,fixRotation:false}],
      },
      sources:[{caseId:'one',sourceRef:'hand fixture',loads:[{nodeId:'J',fxLb:10,fyLb:-20,momentLbIn:12}]},
        {caseId:'two',sourceRef:'hand fixture opposite sign',loads:[{nodeId:'J',fxLb:-4,fyLb:-8,momentLbIn:8}]}],
      combinations:[{caseId:'mix',sourceRef:'explicit only',terms:[{caseId:'one',factor:2},{caseId:'two',factor:-1}]}],
    });
    const row=r.cases[0];
    assert.equal(row.originNodeId,'J');
    near(row.applied.fxLb,24);near(row.applied.fyLb,-32);near(row.applied.momentLbIn,16);
    near(row.support.fxLb,-24);near(row.support.fyLb,32);near(row.support.momentLbIn,-16);
    const bearing=row.supportRows.find(x=>x.nodeId==='B');
    near(bearing.fxLb,-4*9.2/3);near(bearing.fyLb,9.2);
    near(3*bearing.fxLb+4*bearing.fyLb,0);
    near(row.residual.fxLb,0);near(row.residual.fyLb,0);near(row.residual.momentLbIn,0);
    assert.equal(r.fabricationAuthorized,false);
    if(first)assert.deepEqual(row.residual,first.residual);
    first=row;
  }
});
