import test from 'node:test';
import assert from 'node:assert/strict';
import {generateCommonTopology} from '../dist/geometry/src/topology.js';
import {summarizeSchematicLengths} from '../dist/fabrication/src/lengths.js';
test('common truss schematic member lengths are finite and not fabrication-ready',()=>{
 const t=generateCommonTopology({family:'common',spanFt:40,pitchRisePer12:6});
 const r=summarizeSchematicLengths(t);
 assert.equal(r.members.length,13);
 assert.ok(r.members.every(m=>m.centerlineLengthIn>0&&m.fabricationReady===false));
 assert.equal(r.status,'GEOMETRY_ONLY_NOT_ENGINEERED');
});
test('missing member endpoint is rejected',()=>{
 const t=generateCommonTopology({family:'common',spanFt:40,pitchRisePer12:6});
 t.members[0].start='missing';
 assert.throws(()=>summarizeSchematicLengths(t));
});
