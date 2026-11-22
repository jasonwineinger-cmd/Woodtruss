// Command-line demonstration only. This script has no production output path.
import { analyzePreliminaryCommonTruss } from '../dist/analysis/src/common.js';
import { analyzePreliminaryMonoTruss } from '../dist/analysis/src/mono-analysis.js';
import { analyzeExplicitFamily, EXPLICIT_POINT_LOAD_VARIANTS } from '../dist/analysis/src/explicit-family-dispatch.js';
import { analyzeAuthoredModel } from '../dist/analysis/src/authored-model-analysis.js';
import { envelopePreliminaryCases } from '../dist/analysis/src/envelope.js';
import { createPreliminaryTrussPackage } from '../dist/contracts/src/preview.js';
import { createPreliminaryMaterialsReport } from '../dist/fabrication/src/preliminary-materials.js';
import { createPreliminaryMaterialsTraceabilityManifest, fingerprintPreliminaryMaterialsSource } from '../dist/fabrication/src/preliminary-materials-traceability.js';
import { createPreliminarySchematicReview } from '../dist/fabrication/src/preliminary-schematic-review.js';
import { evaluateAtticClearanceLimits } from '../dist/geometry/src/attic-clearance-limits.js';
import { generateDoubleFinkTopology } from '../dist/geometry/src/double-fink-topology.js';

const usage = 'Usage: npm start -- [--family common|mono] [--span-ft 30] [--pitch 6] [--format json|svg]\n'
  + '       npm start -- --attic-clearance --span-ft N --pitch N --room-width-ft N --room-height-ft N\n'
  + '       npm start --silent -- --explicit-point-load < authored-case.json\n'
  + '       npm start --silent -- --authored-model < authored-model.json\n'
  + '       npm start --silent -- --double-fink-reference --span-ft N --pitch N\n'
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

function doubleFinkReference(args) {
  const inputs = new Map();
  for (let i=0; i<args.length; i+=2) {
    const [key,value] = [args[i],args[i+1]];
    if (!['--span-ft','--pitch'].includes(key) || inputs.has(key) || !/^\d+(\.\d+)?$/u.test(value??''))
      throw new Error('Specify one numeric span and pitch for the schematic double-Fink reference.');
    inputs.set(key,Number(value));
  }
  if (inputs.size !== 2) throw new Error('Both schematic span and pitch are required.');
  const result = generateDoubleFinkTopology({family:'common',spanFt:inputs.get('--span-ft'),pitchRisePer12:inputs.get('--pitch')});
  process.stdout.write(JSON.stringify({...result,notice:'NOT FOR FABRICATION',units:{length:'in'}},null,2)+'\n');
}

async function readStdinJson(maxBytes, label) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > maxBytes) throw new Error(`${label} exceeds the ${maxBytes / 1024} KiB input limit.`);
    chunks.push(chunk);
  }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal:true }).decode(Buffer.concat(chunks))); }
  catch { throw new Error(`Provide one UTF-8 JSON ${label.toLowerCase()} on standard input.`); }
}

function writeFiniteJson(result) {
  process.stdout.write(JSON.stringify(result, (_key, value) => {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Nonfinite analysis output.');
    return value;
  }, 2)+'\n');
}

async function explicitPointLoad() {
  const input = await readStdinJson(16_384, 'Authored case');
  const only = (obj, keys) => obj !== null && typeof obj === 'object' && !Array.isArray(obj) &&
    Object.keys(obj).every(key => keys.includes(key));
  const nonempty = (v, max) => typeof v === 'string' && v.length <= max && v.trim().length > 0;
  if (!only(input,['schemaVersion','variant','roof','areaIn2','elasticModulusPsi','loadCase']) ||
      input.schemaVersion !== 'woodtruss.authored-point-load-input.v1' ||
      !EXPLICIT_POINT_LOAD_VARIANTS.includes(input.variant) ||
      !only(input.roof,['family','spanFt','pitchRisePer12','leftPitchRisePer12','rightPitchRisePer12',
        'bottomPitchRisePer12','heelHeightIn','overhangIn']) ||
      !Number.isFinite(input.roof.spanFt) ||
      Object.entries(input.roof).some(([key,v]) => key === 'family' ? typeof v !== 'string' : !Number.isFinite(v)) ||
      !Number.isFinite(input.areaIn2) || !Number.isFinite(input.elasticModulusPsi))
    throw new Error('Invalid authored geometry, properties, scope, or schema.');
  const load = input.loadCase;
  if (!only(load,['id','description','jointLoads']) || !nonempty(load.id,80) || !nonempty(load.description,300) ||
      !Array.isArray(load.jointLoads) || load.jointLoads.length < 1 || load.jointLoads.length > 32)
    throw new Error('Provide one named and described authored case with 1 to 32 joint loads.');
  const seenNodes = new Set();
  for (const row of load.jointLoads) {
    if (!only(row,['nodeId','fxLb','fyLb']) || !nonempty(row.nodeId,32) || seenNodes.has(row.nodeId) ||
        (!Object.hasOwn(row,'fxLb') && !Object.hasOwn(row,'fyLb')) ||
        ['fxLb','fyLb'].some(key => Object.hasOwn(row,key) && !Number.isFinite(row[key])))
      throw new Error('Each authored joint must occur once with at least one finite signed force component in pounds.');
    seenNodes.add(row.nodeId);
  }
  const solved = analyzeExplicitFamily(input);
  if (solved.fabricationAuthorized !== false || solved.status !== 'PRELIMINARY_NOT_ENGINEERED')
    throw new Error('Unexpected authored point-load release status.');
  const output = {
    schemaVersion:'woodtruss.authored-point-load-preview.v1', variant:solved.variant,
    units:{length:'in',force:'lb',stress:'psi'}, input, model:solved.model, result:solved.result,
    equilibrium:solved.equilibrium, warnings:solved.warnings, notice:'NOT FOR FABRICATION',
    scope:'Illustrative pin-jointed response to the supplied point loads only. No site loads, code checks, member or connector capacity, or fabrication.',
    status:solved.status, fabricationAuthorized:false,
  };
  writeFiniteJson(output);
}

async function run(args) {
  if (args.length === 1 && args[0] === '--authored-model') {
    const solved = analyzeAuthoredModel(await readStdinJson(65_536, 'Authored model'));
    if (solved.status !== 'PRELIMINARY_NOT_ENGINEERED' || solved.fabricationAuthorized !== false)
      throw new Error('Unexpected authored model release status.');
    writeFiniteJson({...solved,notice:'NOT FOR FABRICATION'});
    return;
  }
  if (args.length === 1 && args[0] === '--explicit-point-load') {
    await explicitPointLoad();
    return;
  }
  if (args[0] === '--attic-clearance') {
    atticClearance(args.slice(1));
    return;
  }
  if (args[0] === '--double-fink-reference') {
    doubleFinkReference(args.slice(1));
    return;
  }

  if (args.length === 1 && args[0] === '--capabilities') {
    process.stdout.write(JSON.stringify({
      schemaVersion: 'woodtruss.cli-preview-scope.v1',
      demoFamilies: ['common', 'mono'],
      demoFormats: ['json', 'svg'],
      spanRangeFt: { minimum: 8, maximum: 50 },
      explicitPointLoadApiVariants: [...EXPLICIT_POINT_LOAD_VARIANTS],
      explicitPointLoadApiScope: 'These variants are available through the library dispatcher and the authored JSON CLI, not the built-in demo options or a complete family list.',
      explicitPointLoadCli: { option:'--explicit-point-load', input:'stdin', schemaVersion:'woodtruss.authored-point-load-input.v1' },
      authoredModelCli: { option:'--authored-model', input:'stdin', schema:'woodtruss-authored-model/v1', spanFt:{minimum:8,maximum:50} },
      atticScope: { geometry: 'CENTERLINE_CLEARANCE_ONLY', analysisAvailable: false, cliOption: '--attic-clearance' },
      doubleFinkScope: { geometry:'GENERIC_CENTERLINES_ONLY',analysisAvailable:false,cliOption:'--double-fink-reference' },
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
