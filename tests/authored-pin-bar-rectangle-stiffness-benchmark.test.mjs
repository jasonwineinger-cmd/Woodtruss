import test from 'node:test';
import assert from 'node:assert/strict';
import { studyAuthoredElasticFrameCombinationDisplacements as displacements }
  from '../dist/analysis/src/elastic-frame-authored-combination-displacements.js';
import { studyAuthoredElasticFrameCombinationJointBalance as joints }
  from '../dist/analysis/src/elastic-frame-authored-combination-joint-balance.js';

const bars=[['AB',48],['BC',36],['AD',36],['DC',48],['AC',60],['BD',60]];
const areaIn2=4, stiffnessLbPerIn=1000;
function input(ratio) {
  return {modelId:'synthetic-redundant-pin-bars',modelRevision:`r${ratio}`,
    frame:{
      nodes:[{id:'A',xIn:0,yIn:0},{id:'B',xIn:48,yIn:0},{id:'C',xIn:48,yIn:36},{id:'D',xIn:0,yIn:36}],
      members:bars.map(([id, length])=>({id,startNodeId:id[0],endNodeId:id[1],areaIn2,secondMomentIn4:8,
        elasticModulusPsi:stiffnessLbPerIn*length/areaIn2*(id==='BD'?ratio:1),
        releaseStartRotation:true,releaseEndRotation:true})),
      supports:[{nodeId:'A',fixX:true,fixY:true,fixRotation:false},{nodeId:'B',fixX:false,fixY:true,fixRotation:false}],
    },
    sources:[{caseId:'push',sourceRef:'sole synthetic load',loads:[{nodeId:'C',fxLb:120,fyLb:0,momentLbIn:0}]}],
    combinations:[{caseId:'direct',sourceRef:'explicit unit factor',terms:[{caseId:'push',factor:1}]}],
  };
}
const near=(actual,expected)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<1e-8,
  `${actual} does not match independent redundancy analysis ${expected}`);

test('stiffening an unselected pin bar changes exact selected responses but not equilibrium reactions',()=>{
  for (const ratio of [1,2]){
    const basis=input(ratio);
    const movement=displacements({...basis,observedNodeIds:['C'],
      memberStations:[{memberId:'AB',startNodeId:'A',endNodeId:'B',stationsIn:[48,0]},
        {memberId:'AC',startNodeId:'A',endNodeId:'C',stationsIn:[60,0]}]});
    const balance=joints({...basis,caseJoints:[{caseId:'direct',nodeIds:['A','B']}]});
    assert.equal(movement.fabricationAuthorized,false);
    assert.equal(balance.fabricationAuthorized,false);
    const selected=movement.cases[0];
    assert.deepEqual(selected.memberDisplacements.map(row=>row.memberId),['AB','AC']);

    // External statics put +90 lb at B and (-120,-90) lb at A.
    // Let q be tension in BD. Joint equilibrium leaves:
    // AB=-.8q; BC=-90-.6q; AD=-.6q; DC=-.8q; AC=150+q.
    // Minimum strain energy: sum N(dN/dq)/k=0, i.e.
    // 204 + (3+1/ratio)q = 0, with all other k=1000 lb/in.
    const q=-204/(3+1/ratio);
    const ab=-.8*q, ac=150+q, cy=(-90-.6*q)/1000;
    // B is fixed in Y, so Cy follows BC extension. The AC projection
    // is .8 Cx + .6 Cy = AC / k, yielding the independent Cx displacement.
    const cx=(ac/1000-.6*cy)/.8;
    const [c]=selected.nodalDisplacements;
    assert.equal(c.nodeId,'C');
    assert.equal(c.rotationRad,null);
    near(c.uxIn,cx); near(c.uyIn,cy);
    for (const [index,row] of selected.memberDisplacements.entries()){
      const [last,first]=row.samples;
      near(first.axialIn,0);
      near(stiffnessLbPerIn*(last.axialIn-first.axialIn),[ab,ac][index]);
    }
    const [a,b]=balance.cases[0].joints;
    assert.deepEqual([a.nodeId,b.nodeId],['A','B']);
    for (const [r,[x,y]] of [[a,[-120,-90]],[b,[0,90]]]){
      near(r.support.fxLb,x); near(r.support.fyLb,y); near(r.support.momentLbIn,0);
      near(r.residual.fxLb,0); near(r.residual.fyLb,0); near(r.residual.momentLbIn,0);
    }
  }
});
