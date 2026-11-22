import assert from 'node:assert/strict';
import test from 'node:test';
import {studyAtticClearanceCandidates as study} from '../dist/geometry/src/attic-clearance-study.js';

const options=[
 {id:'long-low',spanFt:50,pitchRisePer12:5},
 {id:'short',spanFt:36,pitchRisePer12:8},
 {id:'middle',spanFt:40,pitchRisePer12:7},
 {id:'dominated',spanFt:48,pitchRisePer12:6},
 {id:'too-low',spanFt:36,pitchRisePer12:7},
 {id:'too-high',spanFt:40,pitchRisePer12:10},
 {id:'too-narrow',spanFt:8,pitchRisePer12:18},
];
const base={roomWidthFt:12,requiredClearHeightFt:7,sideClearanceIn:6,headClearanceIn:8,
 maximumRidgeRiseIn:144,candidates:options};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('compares exact room-fit and ridge budgets and separates nondominated tradeoffs',()=>{
 const s=study(base);
 assert.equal(s.status,'GEOMETRY_ONLY_NOT_ENGINEERED');
 assert.equal(s.structuralAnalysisAvailable,false);
 assert.equal(s.atticFloorDesigned,false);
 assert.equal(s.fabricationAuthorized,false);
 assert.deepEqual(s.undominatedCandidateIds,['short','middle','long-low']);
 const rows=new Map(s.candidates.map(row=>[row.id,row]));
 // Independent cross-sections: effective room width 144+2*6; tie must be at least 84+8.
 for(const op of options){
   const r=rows.get(op.id);
   near(r.ridgeRiseIn,op.spanFt*op.pitchRisePer12/2);
   const run=(op.spanFt*12-156)/2;
   near(r.jambRunFromEaveIn,run);
   near(r.headroomSurplusIn,run*op.pitchRisePer12/12-92);
 }
 assert.deepEqual(rows.get('too-low').holds,['head-at-jamb']);
 assert.deepEqual(rows.get('too-high').holds,['ridge-rise-budget']);
 assert.deepEqual(rows.get('too-narrow').holds,['side-to-eave']);
 assert.equal(rows.get('dominated').fitsPlanningGeometry,true);
 assert.deepEqual(study({...base,candidates:[...options].reverse()}).undominatedCandidateIds,s.undominatedCandidateIds);
 assert.deepEqual(study({...base,maximumRidgeRiseIn:100}).undominatedCandidateIds,[]);
});

test('retains tied alternatives and rejects unsupported candidate inputs',()=>{
 const duplicateGeometry={...options[1],id:'short-b'};
 const tied=study({...base,candidates:[...options,duplicateGeometry]});
 assert.deepEqual(tied.undominatedCandidateIds,['short','short-b','middle','long-low']);
 assert.throws(()=>study({...base,candidates:[options[0],options[0]]}),/unique/);
 assert.throws(()=>study({...base,candidates:[{...options[0],spanFt:50.001}]}),/8 and 50/);
 assert.throws(()=>study({...base,candidates:[]}),/1–128/);
 assert.throws(()=>study({...base,maximumRidgeRiseIn:Infinity}),/finite and positive/);
});
