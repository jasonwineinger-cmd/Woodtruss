import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/preview.mjs', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
const runCase = input => spawnSync(process.execPath, [script,'--explicit-point-load'], { encoding:'utf8', input });
const authored = () => ({ schemaVersion:'woodtruss.authored-point-load-input.v1', variant:'agricultural-tied-gable',
  roof:{family:'agricultural',spanFt:40,pitchRisePer12:4}, areaIn2:5.25, elasticModulusPsi:1_000_000,
  loadCase:{id:'illustration-1',description:'Synthetic signed quarter-point case',
    jointLoads:[{nodeId:'Q1',fyLb:-1600},{nodeId:'Q3',fxLb:100,fyLb:400}]} });

test('CLI solves a real common-truss example and emits a review-only preview', () => {
  for (const [span, args] of [[30, []], [24, ['--span-ft', '24', '--pitch', '5']]]) {
    const r = run(...args);
    assert.equal(r.status, 0, r.stderr);
    const preview = JSON.parse(r.stdout);
    assert.equal(preview.status, 'PRELIMINARY_NOT_ENGINEERED');
    assert.equal(preview.fabricationAuthorized, false);
    assert.ok(preview.warnings.some(warning => warning.startsWith('NOT FOR FABRICATION')));
    assert.deepEqual(preview.units, { length: 'in', force: 'lb' });
    assert.ok(preview.geometry.members.length > 2);
    assert.equal(Math.max(...preview.geometry.nodes.map(node => node.x)), span * 12);
    const { L, E } = preview.caseEnvelope.reactions;
    assert.ok(Math.abs(L.y.maxLb - 500) < 1e-5);
    assert.ok(Math.abs(E.y.maxLb - 500) < 1e-5);
  }
});

test('CLI mono preview uses its own asymmetric synthetic load and retains the release hold', () => {
  const r = run('--family', 'mono', '--span-ft', '30', '--pitch', '6');
  assert.equal(r.status, 0, r.stderr);
  const result = JSON.parse(r.stdout);
  assert.equal(result.designId, 'mono-truss-cli-example');
  assert.equal(result.fabricationAuthorized, false);
  assert.ok(result.warnings.some(warning => warning.startsWith('NOT FOR FABRICATION')));
  const { L, E } = result.caseEnvelope.reactions;
  assert.ok(Math.abs(L.y.maxLb-750) < 1e-5);
  assert.ok(Math.abs(E.y.maxLb-250) < 1e-5);
  assert.equal(E.y.governingMaxCase, 'demo-mono-quarter-point-load');
});

test('CLI emits only a watermarked dimensionless schematic for each demo family', () => {
  for (const family of ['common', 'mono']) {
    const r = run('--family', family, '--format', 'svg');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^<svg [^>]*viewBox="0 0 640 360"/u);
    assert.match(r.stdout, /<line x1="/u);
    assert.match(r.stdout, /<text [^>]*>PRELIMINARY - NOT FOR FABRICATION<\/text>/u);
    assert.doesNotMatch(r.stdout, /cutLength|centerlineLength|plateSchedule|machine|<script/u);
  }
});

test('CLI capabilities distinguish built-in demos, authored point loads, and attic geometry', () => {
  const r = run('--capabilities');
  assert.equal(r.status, 0, r.stderr);
  const scope = JSON.parse(r.stdout);
  assert.deepEqual(scope.demoFamilies, ['common','mono']);
  assert.deepEqual(scope.spanRangeFt, { minimum:8, maximum:50 });
  assert.deepEqual(scope.explicitPointLoadApiVariants, ['common-level','common-asymmetric','common-raised-heel','mono-level','scissor-level','agricultural-tied-gable']);
  assert.match(scope.explicitPointLoadApiScope, /not the built-in demo/);
  assert.deepEqual(scope.explicitPointLoadCli,{ option:'--explicit-point-load',input:'stdin',schemaVersion:authored().schemaVersion });
  assert.deepEqual(scope.atticScope, { geometry:'CENTERLINE_CLEARANCE_ONLY', analysisAvailable:false, cliOption:'--attic-clearance' });
  assert.equal(scope.fabricationAuthorized,false);
  assert.equal(scope.notice,'NOT FOR FABRICATION');
  assert.equal(run('--capabilities','--family','mono').status,1);
});

test('CLI runs explicitly authored agricultural point loads, preserving signed demand and holding fabrication', () => {
  const input = authored();
  const r = runCase(JSON.stringify(input));
  assert.equal(r.status,0,r.stderr);
  const preview = JSON.parse(r.stdout);
  assert.deepEqual(preview.input,input);
  assert.equal(preview.variant,'agricultural-tied-gable');
  assert.equal(preview.notice,'NOT FOR FABRICATION');
  assert.equal(preview.fabricationAuthorized,false);
  assert.ok(preview.equilibrium.global.passes && preview.equilibrium.joints.passes);
  assert.ok(Math.abs(preview.result.reactionLb.E.y - (1600*120-400*360+100*40)/480) < 1e-6);
  assert.ok(Math.abs(preview.result.reactionLb.L.x+100) < 1e-6);
  assert.deepEqual(Object.keys(preview.result.displacementIn).sort(),preview.model.nodes.map(node=>node.id).sort());
  input.roof.spanFt=50;
  const max=runCase(JSON.stringify(input));
  assert.equal(max.status,0,max.stderr);
  assert.equal(JSON.parse(max.stdout).model.nodes.find(n=>n.id==='E').x,600);
});

test('authored point-load CLI rejects ambiguous or invalid data without partial output', () => {
  for (const change of [
    d=>{d.roof.spanFt=50.001}, d=>{d.roof.spanFt='40'}, d=>{d.variant='attic'},
    d=>{d.roof.purlinStationsIn=[0,120]}, d=>{d.loadCase.jointLoads.push({nodeId:'Q1',fxLb:5})},
    d=>{d.loadCase.jointLoads=[{nodeId:'Q1',fyLb:null}]}, d=>{d.loadCase.jointLoads=[{nodeId:'Q1'}]},
    d=>{d.loadCase.jointLoads=[{nodeId:'not-a-joint',fyLb:-1}]},
    d=>{d.fabricationAuthorized=true}, d=>{delete d.schemaVersion},
  ]) {
    const input=authored(); change(input);
    const r=runCase(JSON.stringify(input));
    assert.equal(r.status,1,r.stderr);
    assert.equal(r.stdout,'');
  }
  for (const input of ['','[]','{} {}',' '.repeat(16_385)]) {
    assert.equal(runCase(input).status,1);
    assert.equal(runCase(input).stdout,'');
  }
  assert.equal(run('--explicit-point-load','--format','svg').status,1);
});

test('CLI attic clearance uses explicit geometry only and rejects unsupported spans or options', () => {
  const args = ['--attic-clearance','--span-ft','40','--pitch','8','--room-width-ft','12','--room-height-ft','8'];
  const r = run(...args);
  assert.equal(r.status,0,r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.notice,'NOT FOR FABRICATION');
  assert.equal(out.fabricationAuthorized,false);
  assert.equal(out.structuralAnalysisAvailable,false);
  assert.equal(out.minimumGeometricSpanIn,432);
  const over = [...args]; over[2]='51';
  for (const bad of [over,args.slice(0,-2),[...args,'--format','svg']]) {
    const invalid = run(...bad);
    assert.equal(invalid.status,1);
    assert.equal(invalid.stdout,'');
  }
});

test('CLI rejects invalid or unsupported arguments without emitting any package', () => {
  for (const args of [['--span-ft', '51'], ['--pitch', '0'], ['--fabrication'], ['--format', 'dxf'], ['--format'], ['--family', 'hip'], ['--family'], ['--family', 'mono', '--span-ft', '51'], ['--span-ft'], ['--pitch', '6', '--pitch', '7']]) {
    const r = run(...args);
    assert.equal(r.status, 1);
    assert.equal(r.stdout, '');
    assert.match(r.stderr, /Woodtruss preview:/);
  }
});
