const createHarness = require('./sqlite-concurrency-harness.cjs');
const createWorkoutHarness = require('./sqlite-workout-concurrency-harness.cjs');
const start = require('./android-sqlite-concurrency-repro.cjs');
const runDevelopmentExpression = require('./metro-development-runtime.cjs');

function parseArguments(args) {
  const options = {}, seen = new Set();
  let command = 'run', mode = 'select1';
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (seen.has(flag)) throw new Error(`Duplicate option: ${flag}`);
    seen.add(flag);
    if (flag === '--status' || flag === '--stop') {
      if (command !== 'run') throw new Error('Choose either --status or --stop');
      command = flag.slice(2);
    } else if (flag === '--mode') {
      mode = args[++index];
      if (!['select1', 'workout'].includes(mode)) throw new Error('mode must be select1 or workout');
    } else {
      const key = {'--iterations': 'iterations', '--concurrency': 'concurrency', '--allocation-kib': 'allocationKiB', '--connections': 'connections'}[flag];
      if (!key || index + 1 === args.length || args[index + 1].startsWith('--')) throw new Error(`Unknown option or missing value: ${flag}`);
      options[key] = Number(args[++index]);
    }
  }
  if (command !== 'run' && (Object.keys(options).length || seen.has('--mode'))) throw new Error('Configuration flags apply only to a new run');
  const validator = mode === 'workout' ? createWorkoutHarness({development: true, platform: 'android'}, createHarness) : createHarness({development: true, platform: 'android'});
  const validated = validator.validate(options);
  return mode === 'workout' ? {command, options: validated, mode} : {command, options: validated};
}

async function main(args) {
  const {command, options, mode} = parseArguments(args);
  const factory = mode === 'workout' ? `(function(deps){return (${createWorkoutHarness.toString()})(deps, (${createHarness.toString()}));})` : `(${createHarness.toString()})`;
  const result = await runDevelopmentExpression(`(${start.toString()})(${factory},${JSON.stringify(options)},${JSON.stringify(command)});`,
    command === 'run' ? '__sqliteConcurrencyRepro' : '__sqliteConcurrencyReproQuery');
  console.log(JSON.stringify(result, null, 2));
  if (command === 'run') {
    if (result.state === 'failed') process.exitCode = 1;
    else if (result.readFailures > 0 || result.failedOperations > 0) process.exitCode = 2;
  }
}

module.exports = {parseArguments};
if (require.main === module) main(process.argv.slice(2)).catch(error => {
  console.error(error.message);
  console.error('Do not rerun blindly: inspect --status. Host timeout does not cancel native reads; --stop waits for the active batch to settle.');
  process.exitCode = 1;
});
