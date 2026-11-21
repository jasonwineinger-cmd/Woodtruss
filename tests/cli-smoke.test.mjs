import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/preview.mjs', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

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

test('CLI rejects invalid or unsupported arguments without emitting any package', () => {
  for (const args of [['--span-ft', '51'], ['--pitch', '0'], ['--fabrication'], ['--family', 'hip'], ['--family'], ['--family', 'mono', '--span-ft', '51'], ['--span-ft'], ['--pitch', '6', '--pitch', '7']]) {
    const r = run(...args);
    assert.equal(r.status, 1);
    assert.equal(r.stdout, '');
    assert.match(r.stderr, /Woodtruss preview:/);
  }
});
