import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateFabricationRelease} from '../dist/contracts/src/release.js';
test('preliminary truss never releases even with claimed passing evidence',()=>{
 const evidence={independentReviewApproved:true,structuralChecksPassed:true,lumberChecksPassed:true,connectorChecksPassed:true,loadCombinationsPassed:true,manufacturingChecksPassed:true,approvedRevisionId:'rev1'};
 const result=evaluateFabricationRelease({designId:'T1',revisionId:'rev1',status:'PRELIMINARY_NOT_ENGINEERED',evidence});
 assert.equal(result.allowed,false);
});
test('missing or stale approval is blocked',()=>{
 const evidence={independentReviewApproved:true,structuralChecksPassed:true,lumberChecksPassed:true,connectorChecksPassed:true,loadCombinationsPassed:true,manufacturingChecksPassed:true,approvedRevisionId:'rev0'};
 const result=evaluateFabricationRelease({designId:'T1',revisionId:'rev1',status:'ENGINEERING_VERIFIED',evidence});
 assert.equal(result.allowed,false);
 assert.ok(result.reasons.some(r=>r.includes('revision')));
});
test('verified status requires every independent evidence field',()=>{
 const evidence={independentReviewApproved:true,structuralChecksPassed:true,lumberChecksPassed:true,connectorChecksPassed:true,loadCombinationsPassed:true,manufacturingChecksPassed:true,approvedRevisionId:'rev1'};
 assert.equal(evaluateFabricationRelease({designId:'T1',revisionId:'rev1',status:'ENGINEERING_VERIFIED',evidence}).allowed,true);
 assert.equal(evaluateFabricationRelease({designId:'T1',revisionId:'rev1',status:'ENGINEERING_VERIFIED',evidence:{...evidence,connectorChecksPassed:false}}).allowed,false);
});
