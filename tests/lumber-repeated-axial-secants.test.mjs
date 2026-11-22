import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeRepeatedAxialSecants as summarize } from '../dist/lumber/src/index.js';

const reading = (readingId, forceLb, lengthChangeIn) =>
  ({ readingId, forceLb, lengthChangeIn, specimenId: 'synthetic-block', datumId: 'fixture-A' });
const study = () => ({
  specimenId: 'synthetic-block', datumId: 'fixture-A', fromForceLb: -10, toForceLb: -50,
  minimumAbsoluteTravelIn: 0.125,
  trials: [
    { trialId: 'repeat-A', from: reading('A1', -10, -1), to: reading('A2', -50, -1.25) },
    { trialId: 'repeat-B', from: reading('B1', -10, -2), to: reading('B2', -50, -2.5) },
  ],
});

test('reports signed travel and secant scatter, canceling the displacement offset within each repeat', () => {
  const result = summarize(study());
  assert.equal(result.changeInForceLb, -40);
  assert.deepEqual(result.trials.map(r => [r.travelIn, r.secantLbPerIn]), [[-0.25, 160], [-0.5, 80]]);
  assert.deepEqual(result.scatter, { minLbPerIn: 80, maxLbPerIn: 160, rangeLbPerIn: 80 });
  assert.equal(result.observationsIndependentlyVerified, false);
  assert.equal(result.approvedForStructuralUse, false);
  assert.equal(Object.hasOwn(result, 'modulusPsi'), false);
});

test('preserves an explicitly reversed force window without mixing load directions', () => {
  const input = study();
  [input.fromForceLb, input.toForceLb] = [input.toForceLb, input.fromForceLb];
  for (const trial of input.trials) [trial.from, trial.to] = [trial.to, trial.from];
  assert.deepEqual(summarize(input).trials.map(r => [r.travelIn, r.secantLbPerIn]), [[0.25, 160], [0.5, 80]]);
  [input.trials[0].from, input.trials[0].to] = [input.trials[0].to, input.trials[0].from];
  assert.throws(() => summarize(input), /directed force/);
});

test('rejects mixed specimen or datum, recycled readings, or repeated trial labels', () => {
  for (const mutate of [
    input => { input.trials[1].from.specimenId = 'other'; },
    input => { input.trials[1].to.datumId = 'fixture-B'; },
    input => { input.trials[1].to.readingId = 'A2'; },
  ]) {
    const input = study(); mutate(input);
    assert.throws(() => summarize(input), /distinct reading/);
  }
  const input = study();
  input.trials[1].trialId = input.trials[0].trialId;
  assert.throws(() => summarize(input), /unique identity/);
});

test('fails closed on unresolved, reversed, nonfinite or numerically unusable travel', () => {
  for (const end of [-1.0625, -1, -0.5, Number.NaN, -Infinity]) {
    const input = study();
    input.trials[0].to.lengthChangeIn = end;
    assert.throws(() => summarize(input), /Travel must|distinct reading/);
  }
  const input = study();
  input.trials[0].from.lengthChangeIn = Number.MAX_VALUE;
  input.trials[0].to.lengthChangeIn = -Number.MAX_VALUE;
  assert.throws(() => summarize(input), /Travel must/);
  const exactThreshold = study();
  exactThreshold.minimumAbsoluteTravelIn = 0.25;
  assert.equal(summarize(exactThreshold).trials[0].travelIn, -0.25);
});
