// Explicit Metro invocation only. Uses Expo SQLite, no workout application code.
module.exports = function startAndroidSqliteConcurrencyReproduction(createHarness, options, command) {
  if (!globalThis.__DEV__ || typeof globalThis.__r !== 'function') throw new Error('Android Metro development runtime required');
  if (command !== 'run') {
    if (command !== 'status' && command !== 'stop') throw new Error('Unknown reproduction command');
    const accepted = command === 'stop' ? globalThis.__sqliteConcurrencyReproControl?.requestStop() ?? false : undefined;
    globalThis.__sqliteConcurrencyReproQuery = {state: 'reported', stopAccepted: accepted, report: globalThis.__sqliteConcurrencyRepro ?? null};
    return;
  }
  const previous = globalThis.__sqliteConcurrencyRepro;
  if (previous?.state === 'running' || globalThis.__sqliteConcurrencyReproControl?.isRunning()) throw new Error('Reproduction already running; use --status or --stop');
  if (previous?.cleanup?.opened && !previous.cleanup.deleted) throw new Error('Previous disposable database cleanup is incomplete; inspect before rerunning');
  const modules = Array.from(globalThis.__r.getModules());
  const load = name => {
    const entry = modules.find(([, module]) => module.verboseName === name && module.isInitialized);
    if (!entry) throw new Error(`Already-initialized module required: ${name}`);
    return globalThis.__r(entry[0]);
  };
  const {Platform} = load('node_modules/react-native/index.js');
  if (Platform.OS !== 'android') throw new Error('Android development build required');
  const sqlite = load('node_modules/expo-sqlite/build/index.js');
  const harness = createHarness({development: true, platform: Platform.OS, sqlite,
    onProgress: report => { globalThis.__sqliteConcurrencyRepro = report; }});
  harness.validate(options);
  const control = {requestStop: harness.requestStop, isRunning: harness.isRunning};
  globalThis.__sqliteConcurrencyReproControl = control;
  harness.run(options).then(report => {
    if (globalThis.__sqliteConcurrencyReproControl !== control) return;
    globalThis.__sqliteConcurrencyRepro = report;
    delete globalThis.__sqliteConcurrencyReproControl;
  }, () => {
    if (globalThis.__sqliteConcurrencyReproControl !== control) return;
    // Expected native failures are sanitized by the core. No raw message dump.
    globalThis.__sqliteConcurrencyRepro = {state: 'failed', message: 'Unexpected harness failure; inspect before rerunning'};
  });
};
