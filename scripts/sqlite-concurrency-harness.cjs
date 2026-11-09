// Dependency-free core: serialized into Hermes by the explicit Android runner.
// No application services, auth, sync, schema, or production database imports.
module.exports = function createSqliteConcurrencyHarness(dependencies) {
  if (dependencies?.development !== true || dependencies.platform !== 'android') {
    throw new Error('SQLite concurrency reproduction requires Android development mode');
  }
  const now = dependencies.now || Date.now;
  const yieldTask = dependencies.yieldTask || (() => new Promise(resolve => setTimeout(resolve, 0)));
  let running = false, stopRequested = false, report = null;

  function validate(options = {}) {
    if (Object.keys(options).some(key => !['iterations', 'concurrency', 'allocationKiB'].includes(key))) {
      throw new Error('Unknown concurrency reproduction option');
    }
    const config = {iterations: options.iterations ?? 2000, concurrency: options.concurrency ?? 8, allocationKiB: options.allocationKiB ?? 0};
    for (const [key, minimum, maximum] of [['iterations', 1, 100000], ['concurrency', 1, 32], ['allocationKiB', 0, 256]]) {
      if (!Number.isInteger(config[key]) || config[key] < minimum || config[key] > maximum) {
        throw new Error(`${key} must be an integer between ${minimum} and ${maximum}`);
      }
    }
    return config;
  }

  // Only fixed descriptions and allowlisted identifiers leave the harness.
  // Do not print arbitrary native messages, paths, SQL, or exception stacks.
  function sanitize(error) {
    let text = '', code = null;
    try { text = String(error?.message ?? error).replace(/\s+/g, ' '); } catch {}
    try { if (/^(ERR|SQLITE)_[A-Z0-9_]{1,64}$/.test(error?.code)) code = error.code; } catch {}
    const nativeMethod = text.match(/\b(?:NativeDatabase|NativeStatement)\.(?:prepareAsync|runAsync|stepAsync|getAllAsync|finalizeAsync|closeAsync|initAsync)\b/)?.[0] ?? null;
    const released = /shared object.*already released|ERR_USING_RELEASED_SHARED_OBJECT/i.test(text + ' ' + code);
    let category = 'other', description = 'Unclassified failure; raw native message suppressed.';
    if (/NativeStatement/.test(text) && /cannot be cast|cannot cast/i.test(text) && /2nd argument|second argument|java\.lang\.Integer/i.test(text)) {
      category = 'statement-id-conversion'; description = 'NativeStatement bridge ID could not be converted.';
    } else if (released) {
      category = 'shared-object-release'; description = 'Cannot use shared object that was already released.';
    } else if (/SQLITE_LOCKED|database (?:table|schema) is locked/i.test(text + ' ' + code)) {
      category = 'sqlite-locked'; description = 'SQLite reported a table/schema lock.';
    } else if (/SQLITE_BUSY|database is (?:locked|busy)/i.test(text + ' ' + code)) {
      category = 'sqlite-busy'; description = 'SQLite reported a busy/locked database.';
    } else if (/finalized statement|statement.*finalized/i.test(text)) {
      category = 'statement-finalized'; description = 'SQLite statement was already finalized.';
    } else if (/closed resource|database.*closed|closed.*database/i.test(text)) {
      category = 'database-closed'; description = 'SQLite database handle was closed.';
    } else if (text === 'Unexpected SELECT 1 result') {
      category = 'unexpected-result'; description = text;
    }
    return {category, code, nativeMethod, sharedObjectReleased: released, message: description};
  }

  function emit() {
    try { dependencies.onProgress?.(report); } catch { /* Reporting cannot interrupt cleanup. */ }
  }
  function requestStop() {
    if (!running) return false;
    stopRequested = true;
    report.stopRequested = true;
    emit();
    return true;
  }
  async function run(options = {}) {
    const config = validate(options);
    if (running) throw new Error('SQLite concurrency reproduction is already running');
    const sqlite = dependencies.sqlite;
    if (!sqlite?.openDatabaseAsync || !sqlite?.deleteDatabaseAsync) throw new Error('Expo SQLite APIs are unavailable');
    running = true;
    stopRequested = false;
    const started = now();
    const salt = Math.random().toString(16).slice(2) || '0';
    const filename = `sqlite-concurrency-repro-${Date.now()}-${salt}.db`;
    report = {state: 'running', stage: 'opening', filename, config, stopRequested: false,
      phases: [], inFlight: 0, maxInFlight: 0, elapsedMs: 0, readFailures: 0,
      forcedGC: false, allocationBytesGenerated: 0,
      cleanup: {opened: false, allOperationsSettled: false, closeAttempted: false, closed: false, deleted: false}};
    emit();
    let db = null, activeBatch = [], terminalState = 'completed';
    // Only two bounded allocation slabs remain strongly referenced at a time.
    const pressure = [null, null];
    let allocationIndex = 0;
    function allocate() {
      if (!config.allocationKiB) return;
      const bytes = new Uint8Array(config.allocationKiB * 1024);
      bytes[0] = allocationIndex & 255;
      pressure[allocationIndex++ % 2] = {bytes, nodes: Array.from({length: 64}, (_, index) => ({index}))};
      report.allocationBytesGenerated += bytes.length;
    }
    async function read(phase, iteration) {
      report.inFlight++;
      report.maxInFlight = Math.max(report.maxInFlight, report.inFlight);
      phase.maxInFlight = Math.max(phase.maxInFlight, report.inFlight);
      try {
        allocate();
        const rows = await db.getAllAsync('SELECT 1 AS value');
        if (rows.length !== 1 || rows[0]?.value !== 1) throw new Error('Unexpected SELECT 1 result');
        phase.succeeded++;
      } catch (error) {
        const failure = sanitize(error);
        phase.failed++;
        report.readFailures++;
        phase.errorCounts[failure.category] = (phase.errorCounts[failure.category] || 0) + 1;
        if (phase.failureSamples.length < 20) phase.failureSamples.push({iteration, ...failure});
      } finally {
        phase.completed++;
        report.inFlight--;
      }
    }
    try {
      // Keep this strong local reference through both phases and draining.
      db = await sqlite.openDatabaseAsync(filename, {useNewConnection: true});
      report.cleanup.opened = true;
      if (typeof db.databasePath !== 'string' || !db.databasePath.replace(/\\/g, '/').endsWith('/' + filename)) {
        throw new Error('Disposable database path verification failed');
      }
      for (const [name, concurrency] of [['sequential', 1], ['concurrent', config.concurrency]]) {
        if (stopRequested) { terminalState = 'cancelled'; break; }
        const phaseStarted = now();
        const phase = {name, concurrency, requested: config.iterations, scheduled: 0, completed: 0,
          succeeded: 0, failed: 0, maxInFlight: 0, errorCounts: {}, failureSamples: [], elapsedMs: 0};
        report.phases.push(phase);
        report.stage = name;
        emit();
        while (phase.scheduled < config.iterations && !stopRequested) {
          const size = Math.min(concurrency, config.iterations - phase.scheduled);
          activeBatch = [];
          for (let index = 0; index < size; index++) activeBatch.push(read(phase, ++phase.scheduled));
          // read() catches each failure; a rejection never abandons siblings.
          await Promise.all(activeBatch);
          activeBatch = [];
          phase.elapsedMs = Math.max(0, now() - phaseStarted);
          report.elapsedMs = Math.max(0, now() - started);
          emit();
          await yieldTask();
        }
        phase.elapsedMs = Math.max(0, now() - phaseStarted);
        if (stopRequested) { terminalState = 'cancelled'; break; }
      }
    } catch (error) {
      terminalState = 'failed';
      report.fatalError = sanitize(error);
    } finally {
      report.stage = 'cleanup';
      emit();
      // No timeout/stop command closes a handle while native requests remain.
      await Promise.all(activeBatch.map(promise => promise.then(() => {}, () => {})));
      report.cleanup.allOperationsSettled = report.inFlight === 0;
      pressure[0] = pressure[1] = null;
      const ownPath = db && typeof db.databasePath === 'string' && db.databasePath.replace(/\\/g, '/').endsWith('/' + filename);
      if (ownPath && report.cleanup.allOperationsSettled) {
        report.cleanup.closeAttempted = true;
        try {
          await db.closeAsync();
          report.cleanup.closed = true;
          db = null;
          await sqlite.deleteDatabaseAsync(filename);
          report.cleanup.deleted = true;
        } catch (error) {
          report.cleanup.error = sanitize(error);
          terminalState = 'failed';
        }
      } else if (db) {
        // A mismatched handle must not be queried, closed, or deleted.
        terminalState = 'failed';
      }
      report.elapsedMs = Math.max(0, now() - started);
      report.stage = 'finished';
      report.state = terminalState;
      running = false;
      emit();
    }
    return report;
  }
  return {validate, sanitize, run, requestStop, isRunning: () => running, getReport: () => report};
};
