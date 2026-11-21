import assert from 'node:assert/strict';
import test from 'node:test';
import {analyzeExplicitFamily, EXPLICIT_POINT_LOAD_VARIANTS} from '../dist/analysis/src/explicit-family-dispatch.js';

const roof={family:'common',spanFt:40,pitchRisePer12:6};
const solve=(variant,geometry,nodeId)=>analyzeExplicitFamily({
  variant,roof:geometry,areaIn2:5.25,elasticModulusPsi:1_000_000,
  loadCase:{id:'one',description:'Explicit illustration',jointLoads:[{nodeId,fyLb:-800}]},
});
const cases=[
 ['common-level',roof,'Q1',13,200],
 ['common-asymmetric',{spanFt:40,leftPitchRisePer12:4,rightPitchRisePer12:8},'R',13,800*2/3],
 ['common-raised-heel',{...roof,heelHeightIn:12},'HL',17,0],
 ['mono-level',{...roof,family:'mono'},'T3',15,600],
 ['scissor-level',{...roof,family:'scissor',bottomPitchRisePer12:3},'Q3',13,600],
];

test('explicit routes solve only their scoped graph with matching statics and held fabrication',()=>{
 assert.deepEqual(EXPLICIT_POINT_LOAD_VARIANTS,cases.map(c=>c[0]));
 for(const [variant,geometry,node,memberCount,right] of cases){
   const a=solve(variant,geometry,node);
   assert.equal(a.variant,variant);
   assert.equal(a.model.bars.length,memberCount);
   assert.equal(a.status,'PRELIMINARY_NOT_ENGINEERED');
   assert.equal(a.fabricationAuthorized,false);
   assert.ok(a.equilibrium.global.passes && a.equilibrium.joints.passes);
   assert.ok(Math.abs(a.result.reactionLb.E.y-right)<1e-6);
   assert.ok(Math.abs(a.result.reactionLb.L.y-(800-right))<1e-6);
   assert.equal(solve(variant,{...geometry,spanFt:50},node).model.nodes.find(n=>n.id==='E').x,600);
   assert.throws(()=>solve(variant,{...geometry,spanFt:50.001},node));
   assert.throws(()=>solve(variant,geometry,'no-joint'),/explicit joint load/);
 }
});

test('unsupported variants and incompatible roof settings never fall back to common',()=>{
 for(const unknown of ['attic','scissor','hip','agricultural','constructor','__proto__'])
   assert.throws(()=>solve(unknown,roof,'Q1'),/Unsupported explicit point-load variant/);
 assert.throws(()=>solve('common-level',{...roof,heelHeightIn:12},'Q1'),/Raised-heel/);
 assert.throws(()=>solve('common-level',{...roof,bottomPitchRisePer12:1},'Q1'),/flat bottom/);
 assert.throws(()=>solve('common-raised-heel',roof,'Q1'),/1–48/);
 assert.throws(()=>solve('mono-level',roof,'Q1'),/mono family/);
 assert.throws(()=>solve('common-asymmetric',{...cases[1][1],family:'attic'},'Q1'),/Unsupported roof option/);
 assert.throws(()=>solve('common-level',{...roof,rightPitchRisePer12:8},'Q1'),/Unsupported roof option/);
});
