import test from 'node:test';
import assert from 'node:assert/strict';
import {rankPreliminaryMaterialCandidates} from '../dist/lumber/src/selection.js';
import {inventoryConnectorPlateDemands} from '../dist/connections/src/plate-screen.js';
import {renderSchematicTrussSvg} from '../dist/fabrication/src/preview-svg.js';
import {generateCommonTopology} from '../dist/geometry/src/topology.js';

test('material ranking never authorizes structural selection',()=>{
 const catalog={catalogId:'test',records:[{speciesGroup:'TEST',grade:'TEST',nominalSize:'2x4',actualWidthIn:1.5,actualDepthIn:3.5,referenceEdition:'test',referencePublisher:'test',referenceTable:'test',referenceValueId:'r1',fbPsi:1,ftPsi:1,fcPsi:1,fvPsi:1,ePsi:2,eMinPsi:1}]};
 const envelope={status:'PRELIMINARY_NOT_ENGINEERED',memberForces:{m:{minLb:-1000,maxLb:500,governingMinCase:'a',governingMaxCase:'b'}},reactions:{},warnings:[]};
 const r=rankPreliminaryMaterialCandidates(envelope,catalog);
 assert.equal(r.length,1);
 assert.equal(r[0].approvedForStructuralUse,false);
 assert.ok(r[0].maxCompressionStressPsi>r[0].maxTensionStressPsi);
});
test('connector plate inventory refuses fabrication approval',()=>{
 const t=generateCommonTopology({family:'common',spanFt:20,pitchRisePer12:4});
 const r=inventoryConnectorPlateDemands(t.joints,t.members,[]);
 assert.equal(r.length,t.joints.length);
 assert.ok(r.every(x=>x.fabricationAuthorized===false&&x.missingChecks.length>0));
 assert.throws(()=>inventoryConnectorPlateDemands(t.joints,t.members,[{plateId:'p',manufacturer:'',productCode:'x',referenceDocument:'x',lengthIn:3,widthIn:3}]));
});
test('schematic SVG is visibly marked not for fabrication and escapes identifiers',()=>{
 const t=generateCommonTopology({family:'common',spanFt:20,pitchRisePer12:4});
 const svg=renderSchematicTrussSvg(t.joints,t.members);
 assert.match(svg,/PRELIMINARY - NOT FOR FABRICATION/);
 assert.match(svg,/<svg/);
 assert.throws(()=>renderSchematicTrussSvg(t.joints,[{id:'bad',start:'L',end:'missing',kind:'web'}]));
});
