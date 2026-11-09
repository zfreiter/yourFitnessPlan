/** @jest-environment node */
const createHarness = require('../../scripts/sqlite-concurrency-harness.cjs');
const startAndroid = require('../../scripts/android-sqlite-concurrency-repro.cjs');
const {parseArguments} = require('../../scripts/run-android-sqlite-concurrency.cjs');

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return {promise, resolve};
}
function fakeSqlite(read: (sql: string, call: number) => Promise<any> = async () => [{value: 1}]) {
  let calls = 0, active = 0, peak = 0;
  const db = {
    databasePath: '',
    getAllAsync: jest.fn(async (sql: string) => {
      active++; peak = Math.max(peak, active);
      try { return await read(sql, ++calls); } finally { active--; }
    }),
    closeAsync: jest.fn(async () => { expect(active).toBe(0); }),
  };
  const sqlite = {
    openDatabaseAsync: jest.fn(async (filename: string) => { db.databasePath = '/isolated/' + filename; return db; }),
    deleteDatabaseAsync: jest.fn(async () => { expect(active).toBe(0); expect(db.closeAsync).toHaveBeenCalledTimes(1); }),
  };
  return {db, sqlite, active: () => active, peak: () => peak};
}
const makeHarness = (fixture: ReturnType<typeof fakeSqlite>, extra = {}) => createHarness({
  development: true, platform: 'android', sqlite: fixture.sqlite, yieldTask: async () => {}, ...extra,
});
async function until(predicate: () => boolean) {
  for (let i = 0; i < 100; i++) { if (predicate()) return; await new Promise<void>(resolve => setImmediate(resolve)); }
  throw new Error('Test did not settle');
}

it('rejects production and non-Android execution before opening a database', () => {
  const fixture = fakeSqlite();
  expect(() => createHarness({development: false, platform: 'android', sqlite: fixture.sqlite})).toThrow();
  expect(() => createHarness({development: true, platform: 'ios', sqlite: fixture.sqlite})).toThrow();
  expect(fixture.sqlite.openDatabaseAsync).not.toHaveBeenCalled();
});

it.each([{iterations: 0}, {iterations: 100001}, {concurrency: 33}, {concurrency: 1.5}, {allocationKiB: 257}, {filename: 'workout.db'}])('rejects invalid configuration %s without database access', async options => {
  const fixture = fakeSqlite();
  await expect(makeHarness(fixture).run(options)).rejects.toThrow();
  expect(fixture.sqlite.openDatabaseAsync).not.toHaveBeenCalled();
});

it('runs equal-size sequential and bounded concurrent phases on one connection', async () => {
  const fixture = fakeSqlite();
  const result = await makeHarness(fixture).run({iterations: 7, concurrency: 3});
  expect(result.state).toBe('completed');
  expect(result.phases.map((phase: any) => [phase.name, phase.scheduled, phase.completed, phase.maxInFlight])).toEqual([
    ['sequential', 7, 7, 1], ['concurrent', 7, 7, 3],
  ]);
  expect(fixture.db.getAllAsync).toHaveBeenCalledTimes(14);
  expect(fixture.db.getAllAsync.mock.calls.every(([sql]) => sql === 'SELECT 1 AS value')).toBe(true);
  expect(fixture.sqlite.openDatabaseAsync).toHaveBeenCalledTimes(1);
  const [filename, options] = fixture.sqlite.openDatabaseAsync.mock.calls[0] as any;
  expect(filename).toMatch(/^sqlite-concurrency-repro-\d+-[a-f0-9]+\.db$/);
  expect(filename).not.toBe('workout.db');
  expect(options).toEqual({useNewConnection: true});
  expect(fixture.sqlite.deleteDatabaseAsync).toHaveBeenCalledWith(filename);
  expect(result.cleanup).toMatchObject({allOperationsSettled: true, closed: true, deleted: true});
});

it('waits for a failed read and every pending sibling before cleanup', async () => {
  const slow = deferred<any>();
  const fixture = fakeSqlite(async (_sql, call) => {
    if (call === 3) throw new Error("NativeDatabase.prepareAsync: The 2nd argument cannot be cast to type expo.modules.sqlite.NativeStatement (received class java.lang.Integer). Cannot use shared object that was already released.");
    return call === 4 ? slow.promise : [{value: 1}];
  });
  const harness = makeHarness(fixture), run = harness.run({iterations: 2, concurrency: 2});
  await until(() => fixture.db.getAllAsync.mock.calls.length === 4);
  expect(fixture.active()).toBe(1);
  expect(fixture.db.closeAsync).not.toHaveBeenCalled();
  expect(fixture.sqlite.deleteDatabaseAsync).not.toHaveBeenCalled();
  slow.resolve([{value: 1}]);
  const result = await run;
  expect(result.readFailures).toBe(1);
  expect(result.phases[1].errorCounts).toEqual({'statement-id-conversion': 1});
  expect(result.phases[1].failureSamples[0]).toMatchObject({nativeMethod: 'NativeDatabase.prepareAsync', sharedObjectReleased: true});
  expect(result.cleanup.allOperationsSettled).toBe(true);
});

it('cooperatively stops after the active batch settles, without starting more reads', async () => {
  const slow = deferred<any>();
  const fixture = fakeSqlite(async (_sql, call) => call > 4 ? slow.promise : [{value: 1}]);
  const harness = makeHarness(fixture), run = harness.run({iterations: 4, concurrency: 2});
  await until(() => fixture.db.getAllAsync.mock.calls.length === 6);
  expect(harness.requestStop()).toBe(true);
  expect(fixture.db.closeAsync).not.toHaveBeenCalled();
  slow.resolve([{value: 1}]);
  const result = await run;
  expect(result.state).toBe('cancelled');
  expect(result.phases[1].scheduled).toBe(2);
  expect(fixture.db.getAllAsync).toHaveBeenCalledTimes(6);
  expect(result.cleanup.deleted).toBe(true);
  expect(harness.requestStop()).toBe(false);
});

it('rejects overlapping runs on the same instance', async () => {
  const slow = deferred<any>(), fixture = fakeSqlite(() => slow.promise), harness = makeHarness(fixture);
  const run = harness.run({iterations: 1});
  await until(() => fixture.active() === 1);
  await expect(harness.run({iterations: 1})).rejects.toThrow('already running');
  harness.requestStop(); slow.resolve([{value: 1}]); await run;
  expect(fixture.sqlite.openDatabaseAsync).toHaveBeenCalledTimes(1);
});

it.each([
  ['NativeDatabase.prepareAsync: Cannot use shared object that was already released', 'shared-object-release'],
  ['SQLITE_BUSY: database is locked', 'sqlite-busy'],
  ['SQLITE_LOCKED: database table is locked', 'sqlite-locked'],
  ['NativeStatement.finalizeAsync: statement is already finalized', 'statement-finalized'],
  ['NativeDatabase.prepareAsync: database is closed', 'database-closed'],
])('classifies %s separately as %s', (message, category) => {
  expect(makeHarness(fakeSqlite()).sanitize(new Error(message)).category).toBe(category);
});

it('suppresses arbitrary native data, paths and credentials and bounds failure samples', async () => {
  const fixture = fakeSqlite(async () => { throw new Error('Private path /data/user/private.db Bearer secret-token SQL payload'); });
  const result = await makeHarness(fixture).run({iterations: 25, concurrency: 5});
  expect(result.readFailures).toBe(50);
  expect(result.phases.every((phase: any) => phase.failureSamples.length === 20)).toBe(true);
  expect(JSON.stringify(result)).not.toMatch(/private\.db|Bearer|secret-token|SQL payload/);
});

it('allocates bounded pressure without calling a GC API or changing results', async () => {
  const fixture = fakeSqlite();
  const result = await makeHarness(fixture).run({iterations: 3, concurrency: 2, allocationKiB: 4});
  expect(result.allocationBytesGenerated).toBe(6 * 4 * 1024);
  expect(result.forcedGC).toBe(false);
  expect(result.readFailures).toBe(0);
});

it('does not delete a database if close fails', async () => {
  const fixture = fakeSqlite();
  fixture.db.closeAsync.mockRejectedValueOnce(new Error('NativeDatabase.closeAsync: database is closed'));
  const result = await makeHarness(fixture).run({iterations: 1});
  expect(result.state).toBe('failed');
  expect(result.cleanup.allOperationsSettled).toBe(true);
  expect(result.cleanup.closed).toBe(false);
  expect(fixture.sqlite.deleteDatabaseAsync).not.toHaveBeenCalled();
});

it('does not query, close or delete an unexpected database handle', async () => {
  const fixture = fakeSqlite();
  fixture.sqlite.openDatabaseAsync.mockImplementationOnce(async () => { fixture.db.databasePath = '/live/workout.db'; return fixture.db; });
  const result = await makeHarness(fixture).run({iterations: 1});
  expect(result.state).toBe('failed');
  expect(fixture.db.getAllAsync).not.toHaveBeenCalled();
  expect(fixture.db.closeAsync).not.toHaveBeenCalled();
  expect(fixture.sqlite.deleteDatabaseAsync).not.toHaveBeenCalled();
});

it('keeps cleanup running until close and deletion settle', async () => {
  const close = deferred<void>(), fixture = fakeSqlite();
  fixture.db.closeAsync.mockImplementationOnce(() => close.promise);
  const harness = makeHarness(fixture), run = harness.run({iterations: 1});
  await until(() => fixture.db.closeAsync.mock.calls.length === 1);
  expect(harness.getReport()).toMatchObject({state: 'running', stage: 'cleanup'});
  expect(harness.isRunning()).toBe(true);
  expect(fixture.sqlite.deleteDatabaseAsync).not.toHaveBeenCalled();
  close.resolve(); await run;
  expect(harness.isRunning()).toBe(false);
});

it('validates CLI flags without running native code', () => {
  expect(parseArguments(['--iterations', '25', '--concurrency', '4', '--allocation-kib', '8'])).toEqual({command: 'run', options: {iterations: 25, concurrency: 4, allocationKiB: 8}});
  expect(parseArguments(['--status']).command).toBe('status');
  expect(parseArguments(['--stop']).command).toBe('stop');
  for (const args of [['--unknown'], ['--iterations'], ['--iterations', 'bad'], ['--status', '--stop'], ['--status', '--iterations', '2'], ['--concurrency', '2', '--concurrency', '3']]) {
    expect(() => parseArguments(args)).toThrow();
  }
});

it('rejects Android-adapter production invocation before reading any modules', () => {
  const runtime = globalThis as any, previous = runtime.__DEV__;
  try { runtime.__DEV__ = false; expect(() => startAndroid(createHarness, {}, 'run')).toThrow('development runtime required'); }
  finally { runtime.__DEV__ = previous; }
});

it('does not let an old completion clear a newer Android run control', async () => {
  const runtime = globalThis as any;
  const keys = ['__DEV__', '__r', '__sqliteConcurrencyRepro', '__sqliteConcurrencyReproControl'];
  const previous = keys.map(key => ({key, present: Object.prototype.hasOwnProperty.call(runtime, key), value: runtime[key]}));
  const first = deferred<any>(), second = deferred<any>();
  let calls = 0;
  try {
    runtime.__DEV__ = true;
    delete runtime.__sqliteConcurrencyRepro;
    delete runtime.__sqliteConcurrencyReproControl;
    runtime.__r = Object.assign((id: number) => id === 1 ? {Platform: {OS: 'android'}} : {}, {
      getModules: () => new Map([[1, {verboseName: 'node_modules/react-native/index.js', isInitialized: true}],
        [2, {verboseName: 'node_modules/expo-sqlite/build/index.js', isInitialized: true}]]),
    });
    const create = (deps: any) => ({validate() {}, requestStop() {}, isRunning: () => false, run: () => {
      deps.onProgress({state: 'completed', cleanup: {opened: true, deleted: true}});
      return ++calls === 1 ? first.promise : second.promise;
    }});
    startAndroid(create, {}, 'run');
    startAndroid(create, {}, 'run');
    const current = runtime.__sqliteConcurrencyReproControl;
    first.resolve({state: 'completed', older: true}); await Promise.resolve();
    expect(runtime.__sqliteConcurrencyReproControl).toBe(current);
    expect(runtime.__sqliteConcurrencyRepro.older).toBeUndefined();
    second.resolve({state: 'completed', newer: true}); await Promise.resolve();
    expect(runtime.__sqliteConcurrencyRepro.newer).toBe(true);
    expect(runtime.__sqliteConcurrencyReproControl).toBeUndefined();
  } finally {
    for (const entry of previous) {
      if (entry.present) runtime[entry.key] = entry.value;
      else delete runtime[entry.key];
    }
  }
});
