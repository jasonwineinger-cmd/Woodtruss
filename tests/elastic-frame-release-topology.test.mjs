import test from 'node:test';
import assert from 'node:assert/strict';
import {solveElasticFrame} from '../dist/analysis/src/elastic-frame-solve.js';

const length = 100;
const moment = 360;
const section = {areaIn2:3, secondMomentIn4:22, elasticModulusPsi:1_200_000};
const model = {
  nodes:[{id:'A',xIn:15,yIn:35},{id:'B',xIn:15+length,yIn:35},{id:'C',xIn:15+length+65,yIn:35}],
  members:[{id:'AB',startNodeId:'A',endNodeId:'B',...section},
    {id:'BC',startNodeId:'B',endNodeId:'C',...section,releaseStartRotation:true,releaseEndRotation:true}],
  supports:[{nodeId:'A',fixX:true,fixY:true,fixRotation:true},
    {nodeId:'C',fixX:false,fixY:true,fixRotation:false}],
  loads:[{nodeId:'B',fxLb:0,fyLb:0,momentLbIn:moment}],
};
const near = (actual,expected,label,tolerance=1e-10) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual-expected)<=tolerance,
    `${label}: expected ${expected}, received ${actual}`);

test('released BC end does not turn shared B into a whole-joint hinge next to rigid AB',()=>{
  const out = solveElasticFrame(model);
  const EI = section.elasticModulusPsi * section.secondMomentIn4;
  // BC is an initially horizontal axial-only link: its C vertical restraint
  // cannot transmit transverse force to B. AB is a cantilever under a tip
  // couple, so its constant M/EI curvature integrates to these B values.
  near(out.displacements.B.rotationRad,moment*length/EI,'retained shared rotation');
  near(out.displacements.B.uyIn,moment*length**2/(2*EI),'cantilever tip drift');
  near(out.displacements.B.uxIn,0,'no axial displacement');
  near(out.displacements.C.uxIn,0,'free C axial displacement');
  near(out.displacements.C.uyIn,0,'restrained C vertical displacement');
  assert.equal(out.displacements.C.rotationRad,null);
  near(out.reactions.A.fxLb,0,'no A axial reaction',1e-8);
  near(out.reactions.A.fyLb,0,'no A transverse reaction',1e-8);
  near(out.reactions.A.momentLbIn,-moment,'A absorbs entire tip couple',1e-8);
  near(out.reactions.C.fyLb,0,'C absorbs no vertical force',1e-8);
  near(out.reactions.C.momentLbIn,0,'C absorbs no couple',1e-8);
  assert.equal(out.equilibrium.passes,true);
  assert.equal(out.fabricationAuthorized,false);
});

test('an unrestrained transverse translation remains a mechanism even when unmodeled rotation is omitted',()=>{
  const supports = [model.supports[0],{nodeId:'C',fixX:true,fixY:false,fixRotation:false}];
  assert.throws(()=>solveElasticFrame({...model,supports}),/unstable|mechanism|singular|ill-conditioned/i);
});

test('cannot restrain a joint rotation with no incident member rotational connectivity',()=>{
  const supports = [model.supports[0],{...model.supports[1],fixRotation:true}];
  assert.throws(()=>solveElasticFrame({...model,supports}),/rotat|release|unsupported/i);
});
