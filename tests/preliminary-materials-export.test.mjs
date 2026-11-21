import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzePreliminaryCommonTruss} from '../dist/analysis/src/common.js';
import {createPreliminaryMaterialsReport} from '../dist/fabrication/src/preliminary-materials.js';

function model() {
  return analyzePreliminaryCommonTruss({
    roof:{family:'common',spanFt:40,pitchRisePer12:5.7},areaIn2:2,elasticModulusPsi:1e6,ridgeLoadLb:-1000,
  }).model;
}

test('derives a versioned, stable, unrounded centerline report from an actual analysis model',()=>{
  const input=model();
  const report=createPreliminaryMaterialsReport('design-40','rev-002',input);
  assert.equal(report.schemaVersion,'woodtruss.preliminary-materials.v1');
  assert.equal(report.designId,'design-40');
  assert.equal(report.revisionId,'rev-002');
  assert.deepEqual(report.units,{length:'in'});
  assert.equal(report.modelMemberCount,13);
  assert.equal(report.joints.length,8);
  assert.equal(report.members.length,13);
  const firstTop=report.members.find(m=>m.memberId==='top-L-Q1');
  assert.deepEqual(firstTop,{memberId:'top-L-Q1',endJointIds:['L','Q1'],centerlineLengthIn:Math.hypot(120,57)});
  assert.equal(JSON.stringify(report),JSON.stringify(createPreliminaryMaterialsReport('design-40','rev-002',{
    nodes:[...input.nodes].reverse(),bars:[...input.bars].reverse(),
  })));
  const revision=createPreliminaryMaterialsReport('design-40','rev-003',input);
  assert.notEqual(revision.revisionId,report.revisionId);
  assert.deepEqual(revision.members,report.members);
});

test('ignores spoofed release/cut/stock fields and cannot be promoted by mutating the result or its source',()=>{
  const input=model();
  const bar=input.bars[0];
  Object.assign(input,{status:'RELEASED',fabricationAuthorized:true,notice:'approved'});
  Object.assign(bar,{cutLengthIn:200,centerlineLengthIn:19,lumberGrade:'approved',machineCommand:'cut'});
  const report=createPreliminaryMaterialsReport('design-40','rev-002',input);
  const row=report.members.find(m=>m.memberId===bar.id);
  assert.equal(report.status,'PRELIMINARY_NOT_ENGINEERED');
  assert.equal(report.notice,'NOT FOR FABRICATION');
  assert.equal(report.fabricationAuthorized,false);
  assert.deepEqual(Object.keys(row).sort(),['centerlineLengthIn','endJointIds','memberId']);
  assert.equal(row.centerlineLengthIn,Math.hypot(120,57));
  assert.throws(()=>{report.fabricationAuthorized=true;},TypeError);
  assert.throws(()=>{row.endJointIds[0]='cut';},TypeError);
  input.nodes[0].x=999;
  bar.a='MISSING';
  assert.deepEqual(row.endJointIds,['L','Q1']);
  assert.equal(report.joints.find(j=>j.jointId==='L').xIn,0);
});

test('rejects absent and ambiguous traceability or invalid centerline geometry',()=>{
  for (const [designId,revisionId] of [['','r'],['d',' r'],['d\n','r'],['d',null]]) {
    assert.throws(()=>createPreliminaryMaterialsReport(designId,revisionId,model()),/identifier/);
  }
  for (const [mutate,error] of [
    [m=>{m.bars=[];},/Missing schematic/],
    [m=>m.nodes.push({...m.nodes[0]}),/Duplicate joint/],
    [m=>m.bars.push({...m.bars[0]}),/Duplicate member/],
    [m=>{m.nodes[0].x=NaN;},/Nonfinite joint/],
    [m=>{m.bars[0].a='MISSING';},/Unknown member endpoint/],
    [m=>{m.bars[0].b=m.bars[0].a;},/Invalid member centerline/],
    [m=>{m.nodes[0].x=-Number.MAX_VALUE;m.nodes[1].x=Number.MAX_VALUE;},/Invalid member centerline/],
  ]) {
    const input=model();
    mutate(input);
    assert.throws(()=>createPreliminaryMaterialsReport('design-40','rev-002',input),error);
  }
});
