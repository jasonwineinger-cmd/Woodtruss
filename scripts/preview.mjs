// Command-line demonstration only. This script has no production output path.
import { analyzePreliminaryCommonTruss } from '../dist/analysis/src/common.js';
import { envelopePreliminaryCases } from '../dist/analysis/src/envelope.js';
import { createPreliminaryTrussPackage } from '../dist/contracts/src/preview.js';

const usage = 'Usage: npm start -- [--span-ft 30] [--pitch 6]\n'
  + 'Runs an unapproved common-truss example with a fixed 1,000 lb ridge point load.';

function run(args) {
  if (args.length === 1 && args[0] === '--help') {
    process.stdout.write(usage + '\n');
    return;
  }

  const values = new Map([['--span-ft', 30], ['--pitch', 6]]);
  const seen = new Set();
  for (let i = 0; i < args.length; i += 2) {
    const [flag, value] = [args[i], args[i + 1]];
    if (!values.has(flag) || seen.has(flag) || !/^\d+(\.\d+)?$/u.test(value ?? '')) {
      throw new Error('Expected one numeric value per option; only --span-ft and --pitch are supported.');
    }
    seen.add(flag);
    values.set(flag, Number(value));
  }
  const roof = {
    family: 'common',
    spanFt: values.get('--span-ft'),
    pitchRisePer12: values.get('--pitch'),
  };
  const solved = analyzePreliminaryCommonTruss({
    roof, areaIn2: 5.25, elasticModulusPsi: 1_000_000, ridgeLoadLb: -1000,
  });
  const envelope = envelopePreliminaryCases([{ id: 'demo-ridge-point-load', ...solved }]);
  const preview = createPreliminaryTrussPackage('common-truss-cli-example', 'demo-v1', solved.model, envelope);
  if (preview.fabricationAuthorized !== false || preview.status !== 'PRELIMINARY_NOT_ENGINEERED') {
    throw new Error('Unexpected preview release status.');
  }
  preview.warnings.push("NOT FOR FABRICATION: synthetic preview only.", ...solved.warnings);
  process.stdout.write(JSON.stringify(preview, null, 2) + '\n');
}

try {
  run(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`Woodtruss preview: ${error instanceof Error ? error.message : 'Unknown error'}\n${usage}\n`);
  process.exitCode = 1;
}
