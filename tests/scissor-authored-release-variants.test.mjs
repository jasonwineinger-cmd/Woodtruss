import assert from 'node:assert/strict';
import test from 'node:test';
import { generateScissorTopology } from '../dist/geometry/src/scissor.js';
import { buildScissorAuthoredElasticFrameModel } from '../dist/analysis/src/scissor-authored-elastic-frame-model.js';
import { buildAuthoredScissorReleaseVariants } from '../dist/analysis/src/scissor-authored-release-variants.js';

const roof={family:'scissor',spanFt:50,pitchRisePer12:6,bottomPitchRisePer12:3};
const base=()=>buildScissorAuthoredElasticFrameModel({
 roof,
 memberAssignments:generateScissorTopology(roof).members.map(({id,start,end},i)=>({
  memberId:id,startNodeId:start,endNodeId:end,
  areaIn2:5.25+i,secondMomentIn4:5.359375+i,elasticModulusPsi:1e6,
  releaseStartRotation:false,releaseEndRotation:i===0,
  ...(i===0?{shear:{shearModulusPsi:70e3,effectiveShearAreaIn2:3}}:{}),
 })),
 supports:[{nodeId:'L',fixX:true,fixY:true,fixRotation:false},{nodeId:'E',freeDx:1,freeDy:0,fixRotation:false}],
});
const row={memberId:'top-L-Q1',startNodeId:'L',endNodeId:'Q1',releaseStartRotation:true,releaseEndRotation:false};
const supplied=()=>[
 {variantId:'z-baseline',sourceRef:'fixture R1',overrides:[]},
 {variantId:'a-explicit',sourceRef:'fixture R2',overrides:[{...row}]},
];
const plain=value=>JSON.parse(JSON.stringify(value));

test('ordered variants replace both flags on only the exact directed member and detach from authored data',()=>{
 const frame=base(), input=supplied();
 const pristine=plain(frame);
 const variants=buildAuthoredScissorReleaseVariants(frame,input);
 assert.deepEqual(variants.map(({variantId,sourceRef})=>[variantId,sourceRef]),[
  ['z-baseline','fixture R1'],['a-explicit','fixture R2'],
 ]);
 assert.deepEqual(plain(variants[0].frame),pristine);
 const expected=plain(pristine);
 expected.members[0].releaseStartRotation=true;
 expected.members[0].releaseEndRotation=false;
 assert.deepEqual(plain(variants[1].frame),expected);
 assert.deepEqual(plain(variants[1].overrides),[row]);
 const snapshot=plain(variants);
 // Mutate the independently supplied assumptions after review, including
 // nested section data, to detect accidental aliasing in either alternative.
 frame.nodes[0].xIn=11;
 frame.supports[1].freeDx=2;
 frame.members[0].shear.effectiveShearAreaIn2=99;
 frame.members[1].areaIn2=22;
 input[1].overrides[0].releaseStartRotation=false;
 input[1].sourceRef='changed';
 assert.deepEqual(plain(variants),snapshot);
});

test('variant rows, member bindings and final configurations must be exact and distinct',()=>{
 const [unchanged,changed]=supplied();
 const withRows=(...overrides)=>[unchanged,{...changed,overrides}];
 const frame=base();
 for(const invalid of [
  [],
  [unchanged],
  Array.from({length:7},(_,i)=>({...unchanged,variantId:`v-${i}`})),
  [unchanged,{...changed,variantId:unchanged.variantId}],
  [unchanged,{...changed,sourceRef:' '}],
  [unchanged,{...changed,overrides:[],supports:frame.supports}],
  [unchanged,{...changed,overrides:[]}],
  withRows({...row,releaseStartRotation:false,releaseEndRotation:true}),
  withRows({...row,memberId:'unknown'}),
  withRows({...row,startNodeId:'Q1',endNodeId:'L'}),
  withRows({...row,releaseStartRotation:'true'}),
  withRows({...row,elasticModulusPsi:42}),
  withRows(row,row),
 ]){
  assert.throws(()=>buildAuthoredScissorReleaseVariants(frame,invalid),/variant|override/u);
 }
});
