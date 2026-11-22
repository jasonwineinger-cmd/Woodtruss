import assert from 'node:assert/strict';
import test from 'node:test';
import {solveElasticFrame} from '../dist/analysis/src/elastic-frame-solve.js';
import {evaluateFabricationRelease} from '../dist/contracts/src/release.js';
import {createPreliminaryMaterialsReport} from '../dist/fabrication/src/preliminary-materials.js';

test('a balanced rigid-frame result and ideal supports cannot become a release record or schematic member order',()=>{
 const section={areaIn2:2,secondMomentIn4:12,elasticModulusPsi:1e6};
 const frame={
  nodes:[{id:'A',xIn:0,yIn:0},{id:'P',xIn:60,yIn:0},{id:'B',xIn:120,yIn:0}],
  members:[{id:'AP',startNodeId:'A',endNodeId:'P',...section},
   {id:'PB',startNodeId:'P',endNodeId:'B',...section}],
  supports:[{nodeId:'A',fixX:true,fixY:true,fixRotation:false},
   {nodeId:'B',fixX:false,fixY:true,fixRotation:false}],
  // Interior of the full span, represented at an explicit frame node.
  loads:[{nodeId:'P',fxLb:0,fyLb:-100,momentLbIn:0}],
 };
 const result=solveElasticFrame(frame);
 assert.equal(result.equilibrium.passes,true);
 const near=(value,expected)=>assert.ok(Math.abs(value-expected)<1e-8);
 near(result.reactions.A.fyLb,50);
 near(result.reactions.B.fyLb,50);
 near(result.displacements.P.uyIn,-100*120**3/(48*section.elasticModulusPsi*section.secondMomentIn4));
 assert.equal(result.status,'PRELIMINARY_NOT_ENGINEERED');
 assert.equal(result.fabricationAuthorized,false);
 assert.throws(()=>createPreliminaryMaterialsReport('frame-fixture','r2',frame),/Missing schematic nodes or members/u);

 const fabricatedClaim={independentReviewApproved:true,structuralChecksPassed:result.equilibrium.passes,
  lumberChecksPassed:true,connectorChecksPassed:true,loadCombinationsPassed:true,manufacturingChecksPassed:true,
  approvedRevisionId:'r2'};
 const request={designId:'frame-fixture',revisionId:'r2',status:result.status,evidence:fabricatedClaim};
 assert.deepEqual(evaluateFabricationRelease(request),{allowed:false,reasons:[
  'Design is not engineering-verified','No trusted engineering approval issuer is configured',
 ]});
 // Neither relabeling nor reusing an exact older approval label promotes a numerical witness.
 const overridden={...request,...result,status:'ENGINEERING_VERIFIED'};
 assert.deepEqual(evaluateFabricationRelease(overridden),{allowed:false,reasons:[
  'No trusted engineering approval issuer is configured',
 ]});
 assert.deepEqual(evaluateFabricationRelease({...overridden,revisionId:'r3'}),{allowed:false,reasons:[
  'Approval revision mismatch','No trusted engineering approval issuer is configured',
 ]});
});
