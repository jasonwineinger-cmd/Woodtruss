import assert from 'node:assert/strict';
import test from 'node:test';
import {evaluateAtticClearanceLimits as limits} from '../dist/geometry/src/attic-clearance-limits.js';
import {generateAtticRoomTopology} from '../dist/geometry/src/attic-topology.js';

const base={family:'attic',spanFt:40,pitchRisePer12:8,roomWidthFt:12,
  requiredClearHeightFt:7,sideClearanceIn:6,headClearanceIn:8};

test('solves both clearance extrema from an independent eave-to-jamb slope',()=>{
 const v=limits(base);
 // 40 ft/2 - 12 ft/2 - 6 in = 162 in, at 8:12 gives 108 in.
 assert.equal(v.jambRunFromEaveIn,162);
 assert.equal(v.riseIn,160);
 assert.equal(v.maximumRoomHeightAtRequestedWidthIn,100);
 // At 84+8 in high each slope needs 138 in of horizontal run.
 assert.equal(v.maximumRoomWidthAtRequestedHeightIn,192);
 assert.equal(v.minimumGeometricSpanIn,432);
 assert.equal(v.headroomSurplusIn,16);
 assert.equal(v.governingConstraint,'head-at-jamb');
 assert.equal(v.fitsCenterlineEnvelope,true);
 assert.equal(v.structuralAnalysisAvailable,false);
 assert.equal(v.atticFloorDesigned,false);
 assert.equal(v.fabricationAuthorized,false);
 assert.equal(generateAtticRoomTopology(base).tieCenterlineHeightIn,108);
 assert.equal(limits({...base,roomWidthFt:16}).headroomSurplusIn,0);
 assert.equal(limits({...base,roomWidthFt:16.001}).fitsCenterlineEnvelope,false);
 assert.throws(()=>generateAtticRoomTopology({...base,roomWidthFt:16.001}));
});

test('reports infeasibility without changing dimensions, and enforces the hard cap',()=>{
 const wall=limits({...base,sideClearanceIn:168});
 assert.equal(wall.governingConstraint,'side-to-eave');
 assert.equal(wall.fitsCenterlineEnvelope,false);
 assert.equal(wall.maximumRoomWidthAtRequestedHeightIn,0);
 const cap=limits({...base,spanFt:50,roomWidthFt:26});
 assert.equal(cap.minimumGeometricSpanIn,600);
 assert.equal(cap.fitsWithMaximumSupportedSpan,true);
 assert.equal(limits({...base,spanFt:50,roomWidthFt:26.01}).fitsWithMaximumSupportedSpan,false);
 for(const bad of [
   {spanFt:50.001},{spanFt:51},{heelHeightIn:1},{overhangIn:1},{floorElevationIn:1},
   {headClearanceIn:-1},{sideClearanceIn:Infinity},{pitchRisePer12:Number.MIN_VALUE},
 ])assert.throws(()=>limits({...base,...bad}));
});
