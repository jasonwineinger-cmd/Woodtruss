import test from 'node:test';
import assert from 'node:assert/strict';
import { studyAuthoredMonoElasticFrameDisplacements as study }
  from '../dist/analysis/src/mono-authored-elastic-frame-displacements.js';

const incidence = [
  ['top-L-T1','L','T1'], ['bottom-L-B1','L','B1'], ['web-T1-B1','T1','B1'],
  ['top-T1-T2','T1','T2'], ['bottom-B1-B2','B1','B2'], ['web-T2-B2','T2','B2'], ['web-T1-B2','T1','B2'],
  ['top-T2-T3','T2','T3'], ['bottom-B2-B3','B2','B3'], ['web-T3-B3','T3','B3'], ['web-T2-B3','T2','B3'],
  ['top-T3-T4','T3','T4'], ['bottom-B3-E','B3','E'], ['web-T4-E','T4','E'], ['web-T3-E','T3','E'],
];
const near = (actual, expected) => assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) < 1e-10,
  `${actual} does not match the independent pin-limit displacement ${expected}`);

test('released directed high web matches hand axial shortening and signed transverse compatibility', () => {
  const result = study({
    modelId:'synthetic-mono-displacement', modelRevision:'r1',
    roof:{family:'mono',spanFt:20,pitchRisePer12:6},
    memberAssignments:incidence.map(([memberId,startNodeId,endNodeId])=>({
      memberId,startNodeId,endNodeId, areaIn2:8, secondMomentIn4:12, elasticModulusPsi:1.2e6,
      releaseStartRotation:true,releaseEndRotation:true,
    })),
    supports:[
      {nodeId:'L',fixX:true,fixY:true,fixRotation:false},
      {nodeId:'E',fixX:false,fixY:true,fixRotation:false},
    ],
    sources:[
      {caseId:'tip',sourceRef:'synthetic high joint load',loads:[{nodeId:'T4',fxLb:0,fyLb:-400,momentLbIn:0}]},
      {caseId:'midpoint',sourceRef:'synthetic force in the directed vertical web',loads:[],
        memberPointLoads:[{memberId:'web-T4-E',stationIn:60,fxLb:0,fyLb:-400}]},
    ],
    combinations:[
      {caseId:'down',sourceRef:'positive authored factor',terms:[{caseId:'tip',factor:1}]},
      {caseId:'up',sourceRef:'negative authored factor',terms:[{caseId:'tip',factor:-.5}]},
      {caseId:'mid',sourceRef:'explicit midpoint load',terms:[{caseId:'midpoint',factor:1}]},

    ],
    observedNodeIds:['T4','E'],
    memberStations:[{memberId:'web-T4-E',startNodeId:'T4',endNodeId:'E',stationsIn:[0,30,60,90,120]}],
  });
  assert.equal(result.fabricationAuthorized,false);
  assert.deepEqual(result.cases.map(row=>row.caseId),['down','up','mid']);
  for (const [index,factor] of [1,-.5].entries()) {
    const row = result.cases[index];
    assert.deepEqual(row.nodalDisplacements.map(item=>item.nodeId),['T4','E']);
    const [top,bearing] = row.nodalDisplacements;
    // Only the 120-in high web carries axial compression in this pin limit.
    // The unloaded sloping chord enforces ux + (rise/run)uy = 0 at T4.
    const topY = -factor * 400 * 120 / (8 * 1.2e6);
    const topX = -.5 * topY;
    near(top.uxIn,topX); near(top.uyIn,topY); assert.equal(top.rotationRad,null);
    near(bearing.uxIn,0); near(bearing.uyIn,0); assert.equal(bearing.rotationRad,null);
    assert.equal(row.memberDisplacements.length,1);
    const web = row.memberDisplacements[0];
    assert.deepEqual([web.memberId,web.startNodeId,web.endNodeId],['web-T4-E','T4','E']);
    assert.deepEqual(web.samples.map(sample=>sample.stationIn),[0,30,60,90,120]);
    for (const sample of web.samples) {
      // Ordered local axial is global -Y, transverse is global +X. Both
      // interpolate from T4 to E; local cross-section rotation is dv/ds,
      // not the absent pin-joint global rotation.
      const remain = 1 - sample.stationIn / 120;
      near(sample.axialIn,-topY * remain);
      near(sample.transverseIn,topX * remain);
      near(sample.rotationRad,-topX / 120);
    }
  }
  const middle = result.cases[2];
  const [top] = middle.nodalDisplacements;
  const u0 = 400*60/(8*1.2e6);
  near(top.uyIn,-u0);
  near(top.uxIn,u0/2);
  assert.equal(top.rotationRad,null);
  for(const row of middle.memberDisplacements[0].samples) {
    // The upper half carries no axial force; below the load the same
    // compressive strain persists. Translation is continuous at station 60.
    near(row.axialIn,400*Math.min(60,120-row.stationIn)/(8*1.2e6));
    near(row.transverseIn,(u0/2)*(1-row.stationIn/120));
    near(row.rotationRad,-u0/240);
  }
});
