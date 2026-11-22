// Command-line demonstration only. This script has no production output path.
import { analyzePreliminaryCommonTruss } from '../dist/analysis/src/common.js';
import { analyzePreliminaryMonoTruss } from '../dist/analysis/src/mono-analysis.js';
import { EXPLICIT_POINT_LOAD_VARIANTS } from '../dist/analysis/src/explicit-family-dispatch.js';
import { envelopePreliminaryCases } from '../dist/analysis/src/envelope.js';
import { createPreliminaryTrussPackage } from '../dist/contracts/src/preview.js';
import { createPreliminaryMaterialsReport } from '../dist/fabrication/src/preliminary-materials.js';
import { createPreliminaryMaterialsTraceabilityManifest, fingerprintPreliminaryMaterialsSource } from '../dist/fabrication/src/preliminary-materials-traceability.js';
import { createPreliminarySchematicReview } from '../dist/fabrication/src/preliminary-schematic-review.js';
import { evaluateAtticClearanceLimits } from '../dist/geometry/src/attic-clearance-limits.js';

const usage = 'Usage: npm start -- [--family common|mono] [--span-ft 30] [--pitch 6] [--format json|svg]\n'
  + '       npm start -- --attic-clearance --span-ft N --pitch N --room-width-ft N --room-height-ft N\n'
  + 'Use --capabilities by itself to list the supported scope.\n'
  + 'Runs a synthetic example: a 1,000 lb point load at the common ridge or mono quarter-point.';

function atticClearance(args) {
  const required = new Map([['--span-ft','spanFt'],['--pitch','pitchRisePer12'],
    ['--room-width-ft','roomWidthFt'],['--room-height-ft','requiredClearHeightFt']]);
  const input = { family: 'attic' };
  for (let i=0; i<args.length; i+=2) {
    const [flag,value] = [args[i],args[i+1]];
    const key = required.get(flag);
    if (!key || Object.hasOwn(input,key) || !/^\d+(\.\d+)?$/u.test(value??''))
      throw new Error('Specify each attic option once with one numeric value.');
    input[key]=Number(value);
  }
  if ([...required.values()].some(key=>!Object.hasOwn(input,key)))
    throw new Error('All four attic geometry dimensions are required.');
  const result = evaluateAtticClearanceLimits(input);
  if (result.fabricationAuthorized !== false || result.structuralAnalysisAvailable !== false)
    throw new Error('Unexpected attic preview status.');
  process.stdout.write(JSON.stringify({...result, notice:'NOT FOR FABRICATION',
    scope:'Ideal centerlines only, no real wall thickness, member size, floor or structural verification.'},null,2)+'\n');
}

async function run(args) {
  if (args[0] === '--attic-clearance') {
    atticClearance(args.slice(1));
    return;
  }

  if (args.length === 1 && args[0] === '--capabilities') {
    process.stdout.write(JSON.stringify({
      schemaVersion: 'woodtruss.cli-preview-scope.v1',
      demoFamilies: ['common', 'mono'],
      demoFormats: ['json', 'svg'],
      spanRangeFt: { minimum: 8, maximum: 50 },
      explicitPointLoadApiVariants: [...EXPLICIT_POINT_LOAD_VARIANTS],
      explicitPointLoadApiScope: 'These variants are for the library dispatcher only, not the CLI or a complete family list.',
      atticScope: { geometry: 'CENTERLINE_CLEARANCE_ONLY', analysisAvailable: false, cliOption: '--attic-clearance' },
      notice: 'NOT FOR FABRICATION',
      fabricationAuthorized: false,
    }, null, 2) + '\n');
    return;
  }
  if (args.length === 1 && args[0] === '--help') {
    process.stdout.write(usage + '\n');
    return;
  }

  const values = new Map([['--family', 'common'], ['--format', 'json'], ['--span-ft', 30], ['--pitch', 6]]);
  const seen = new Set();
  for (let i = 0; i < args.length; i += 2) {
    const [flag, value] = [args[i], args[i + 1]];
    if (!values.has(flag) || seen.has(flag)) {
      throw new Error('Options may be supplied once: --family, --span-ft, --pitch, --format.');
    }
    seen.add(flag);
    if (flag === '--family') {
      if (!['common', 'mono'].includes(value)) throw new Error('Preview family must be common or mono.');
      values.set(flag, value);
    } else if (flag === '--format') {
      if (!['json', 'svg'].includes(value)) throw new Error('Preview format must be json or svg.');
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
  if (values.get('--format') === 'svg') {
    const designId = family + '-truss-cli-example';
    const revisionId = 'synthetic-schematic-v1';
    const source = { nodes: solved.model.nodes, bars: solved.model.bars };
    const snapshot = createPreliminaryMaterialsReport(designId, revisionId, source);
    const expected = { designId, revisionId, sourceGeometrySha256: await fingerprintPreliminaryMaterialsSource(source) };
    const traceabilityManifest = await createPreliminaryMaterialsTraceabilityManifest(snapshot);
    const preview = await createPreliminarySchematicReview({ snapshot, expected, traceabilityManifest });
    if (preview.fabricationAuthorized !== false || preview.format !== 'NORMALIZED_VECTOR_REVIEW_NO_DIMENSIONS' ||
        preview.notice !== 'PRELIMINARY - NOT FOR FABRICATION') throw new Error('Unexpected schematic release status.');
    process.stdout.write(preview.drawingSvg + '\n');
    return;
  }
  const envelope = envelopePreliminaryCases([{ id: caseId, ...solved }]);
  const preview = createPreliminaryTrussPackage(family + '-truss-cli-example', 'demo-v1', solved.model, envelope);
  if (preview.fabricationAuthorized !== false || preview.status !== 'PRELIMINARY_NOT_ENGINEERED') {
    throw new Error('Unexpected preview release status.');
  }
  preview.warnings.push("NOT FOR FABRICATION: synthetic preview only.", ...solved.warnings);
  process.stdout.write(JSON.stringify(preview, null, 2) + '\n');
}

try {
  await run(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`Woodtruss preview: ${error instanceof Error ? error.message : 'Unknown error'}\n${usage}\n`);
  process.exitCode = 1;
}
