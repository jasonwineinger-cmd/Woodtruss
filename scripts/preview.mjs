// Command-line demonstration only. This script has no production output path.
import { analyzePreliminaryCommonTruss } from '../dist/analysis/src/common.js';
import { analyzePreliminaryMonoTruss } from '../dist/analysis/src/mono-analysis.js';
import { envelopePreliminaryCases } from '../dist/analysis/src/envelope.js';
import { createPreliminaryTrussPackage } from '../dist/contracts/src/preview.js';

const usage = 'Usage: npm start -- [--family common|mono] [--span-ft 30] [--pitch 6]\n'
  + 'Runs a synthetic example: a 1,000 lb point load at the common ridge or mono quarter-point.';

function run(args) {
  if (args.length === 1 && args[0] === '--help') {
    process.stdout.write(usage + '\n');
    return;
  }

  const values = new Map([['--family', 'common'], ['--span-ft', 30], ['--pitch', 6]]);
  const seen = new Set();
  for (let i = 0; i < args.length; i += 2) {
    const [flag, value] = [args[i], args[i + 1]];
    if (!values.has(flag) || seen.has(flag)) {
      throw new Error('Options may be supplied once: --family, --span-ft, --pitch.');
    }
    seen.add(flag);
    if (flag === '--family') {
      if (!['common', 'mono'].includes(value)) throw new Error('Preview family must be common or mono.');
      values.set(flag, value);
    } else {
      if (!/^\d+(\.\d+)?$/u.test(value ?? '')) throw new Error('Expected a numeric value for ' + flag);
      values.set(flag, Number(value));
    }
  }
  const family = values.get('--family');
  const roof = { family, spanFt: values.get('--span-ft'), pitchRisePer12: values.get('--pitch') };
  const properties = { roof, areaIn2: 5.25, elasticModulusPsi: 1_000_000 };
  const caseId = family === 'common' ? 'demo-ridge-point-load' : 'demo-mono-quarter-point-load';
  const solved = family === 'common'
    ? analyzePreliminaryCommonTruss({ ...properties, ridgeLoadLb: -1000 })
    : analyzePreliminaryMonoTruss({ ...properties, loadCase: {
      id: caseId, description: 'Synthetic 1,000 lb downward point load at the first mono top joint',
      jointLoads: [{ nodeId: 'T1', fyLb: -1000 }],
    } });
  const envelope = envelopePreliminaryCases([{ id: caseId, ...solved }]);
  const preview = createPreliminaryTrussPackage(family + '-truss-cli-example', 'demo-v1', solved.model, envelope);
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
