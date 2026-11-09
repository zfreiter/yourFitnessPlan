/** @jest-environment node */
import { createRequire } from 'module';
const {DatabaseSync} = createRequire(__filename)('node:sqlite');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const createBasic = require('../../scripts/sqlite-concurrency-harness.cjs');
const createWorkout = require('../../scripts/sqlite-workout-concurrency-harness.cjs');
const {parseArguments} = require('../../scripts/run-android-sqlite-concurrency.cjs');

type Event = {method: string; sql: string; connection: number};
type Fault = (event: Event) => Promise<void> | void;
const opened: Array<{dispose: () => void}> = [];
function fixture(fault: Fault = () => {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sqlite-workload-test-'));
  const raw: any[] = [], statements: any[] = [], events: Event[] = [];
  let active = 0, peak = 0;
  async function perform<T>(event: Event, action: () => T) {
    events.push(event); active++; peak = Math.max(peak, active);
    try { await fault(event); await Promise.resolve(); return action(); }
    finally { active--; }
  }
  const sqlite = {
    openDatabaseAsync: jest.fn(async (name: string) => {
      expect(name).toMatch(/^sqlite-workout-repro-\d+-[a-f0-9]+\.db$/);
      const connection = raw.length, databasePath = path.join(directory, name), native = new DatabaseSync(databasePath);
      const record = {native, closed: false}; raw.push(record);
      return {
        databasePath,
        execAsync: (sql: string) => perform({method: 'execAsync', sql, connection}, () => native.exec(sql)),
        runAsync: (sql: string, args: any[] = []) => perform({method: 'runAsync', sql, connection}, () => native.prepare(sql).run(...args)),
        getAllAsync: (sql: string, args: any[] = []) => perform({method: 'getAllAsync', sql, connection}, () => native.prepare(sql).all(...args)),
        prepareAsync: (sql: string) => perform({method: 'prepareAsync', sql, connection}, () => {
          const prepared = native.prepare(sql), state = {sql, finalized: false, finalizeAttempts: 0, executions: 0}; statements.push(state);
          return {
            executeAsync: (args: any[]) => perform({method: 'executeAsync', sql, connection}, () => {
              expect(state.finalized).toBe(false); state.executions++;
              if (/^SELECT/i.test(sql.trim())) return {getAllAsync: () => perform({method: 'result.getAllAsync', sql, connection}, () => { expect(state.finalized).toBe(false); return prepared.all(...args); })};
              return prepared.run(...args);
            }),
            finalizeAsync: async () => {
              state.finalizeAttempts++;
              return perform({method: 'finalizeAsync', sql, connection}, () => { expect(state.finalized).toBe(false); state.finalized = true; });
            },
          };
        }),
        closeAsync: async () => {
          expect(active).toBe(0);
          await perform({method: 'closeAsync', sql: '', connection}, () => { native.close(); record.closed = true; });
        },
      };
    }),
    deleteDatabaseAsync: jest.fn(async (name: string) => {
      expect(active).toBe(0); expect(raw.every(record => record.closed)).toBe(true);
      fs.unlinkSync(path.join(directory, name));
    }),
  };
  const result = {sqlite, raw, statements, events, peak: () => peak, active: () => active,
    dispose: () => {
      const target = path.resolve(directory);
      if (path.dirname(target) !== path.resolve(os.tmpdir()) || !path.basename(target).startsWith('sqlite-workload-test-')) throw new Error('Unsafe test cleanup target');
      for (const record of raw) if (!record.closed) record.native.close();
      fs.rmSync(target, {recursive: true, force: true});
    }};
  opened.push(result);
  return result;
}
function harness(f: ReturnType<typeof fixture>) { return createWorkout({development: true, platform: 'android', sqlite: f.sqlite, yieldTask: async () => {}}, createBasic); }
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return {promise, resolve}; }
async function until(predicate: () => boolean) { for (let i = 0; i < 100; i++) { if (predicate()) return; await new Promise<void>(resolve => setImmediate(resolve)); } throw new Error('Did not settle'); }
afterEach(() => opened.splice(0).forEach(item => item.dispose()));

it('hydrates all synthetic relationships and exercises every operation kind using real SQL', async () => {
  const f = fixture(), result = await harness(f).run({iterations: 14, concurrency: 4});
  expect(result.state).toBe('completed'); expect(result.failedOperations).toBe(0);
  expect(result.fixture).toEqual({ownedWorkouts: 3, otherOwnerWorkouts: 1, exercises: 4, sets: 12, circuits: 1, cardioEntries: 3, intervals: 12});
  expect(result.phases.map((p: any) => [p.completed, p.peakSqliteCalls])).toEqual([[14, 1], [14, 4]]);
  for (const phase of result.phases) {
    expect(Object.values(phase.operationCounts)).toEqual([2, 2, 2, 2, 2, 2, 2]);
    expect(phase.sqliteCallsScheduled).toBe(phase.sqliteCallsCompleted);
    expect(phase.errorCounts).toEqual({});
  }
  expect(f.statements).toHaveLength(8);
  expect(f.statements.every(s => s.finalized && s.finalizeAttempts === 1 && s.executions >= 2)).toBe(true);
  expect(result.statementsPrepared).toBe(result.statementsFinalized);
  expect(result.cleanup).toMatchObject({allOperationsSettled: true, explicitStatementsFinalized: true, connectionsOpened: 1, connectionsClosed: 1, closed: true, deleted: true});
  expect(f.events.some(event => /sync_queue|workout\.db|app_meta/.test(event.sql))).toBe(false);
});

it('caps native call concurrency even when service reads fan out inside a logical job', async () => {
  const f = fixture(), result = await harness(f).run({iterations: 7, concurrency: 2});
  expect(result.failedOperations).toBe(0);
  expect(result.phases[1].peakSqliteCalls).toBe(2);
  expect(f.peak()).toBeLessThanOrEqual(2);
  expect(result.phases[0].peakSqliteCalls).toBe(1);
});

it('adds a separate two-connection phase and closes both handles before deleting the fixture', async () => {
  const f = fixture(), result = await harness(f).run({iterations: 7, concurrency: 3, connections: 2});
  expect(result.state).toBe('completed'); expect(result.failedOperations).toBe(0);
  expect(result.phases.map((p: any) => [p.name, p.connections, p.completed])).toEqual([
    ['sequential', 1, 7], ['concurrent', 1, 7], ['multi-connection', 2, 7],
  ]);
  expect(f.sqlite.openDatabaseAsync).toHaveBeenCalledTimes(2);
  expect(f.sqlite.openDatabaseAsync.mock.calls[0][0]).toBe(f.sqlite.openDatabaseAsync.mock.calls[1][0]);
  expect(f.raw.every(record => record.closed)).toBe(true);
  expect(result.cleanup.connectionsClosed).toBe(2);
  expect(f.sqlite.deleteDatabaseAsync).toHaveBeenCalledTimes(1);
});

it('joins all failed parallel-read branches before closing a handle', async () => {
  const slow = deferred(); let activeHarness: any, delayed = false;
  const f = fixture(async event => {
    if (activeHarness?.getReport()?.stage !== 'concurrent' || event.method !== 'getAllAsync') return;
    if (/FROM circuit_rounds/.test(event.sql)) throw new Error('NativeDatabase.prepareAsync: The 2nd argument cannot be cast to type NativeStatement (received class java.lang.Integer). Cannot use shared object that was already released');
    if (/FROM cardio_entries/.test(event.sql)) { delayed = true; await slow.promise; }
  });
  activeHarness = harness(f); const run = activeHarness.run({iterations: 5, concurrency: 5});
  await until(() => delayed);
  expect(f.events.some(event => event.method === 'closeAsync')).toBe(false);
  slow.resolve(); const result = await run;
  expect(result.phases[1].nativeErrorCounts['statement-id-conversion']).toBeGreaterThan(0);
  expect(result.phases[1].errorCounts['statement-id-conversion']).toBeGreaterThan(0);
  expect(result.cleanup.allOperationsSettled).toBe(true);
  expect(result.cleanup.deleted).toBe(true);
});

it('finalizes an explicitly prepared statement when its execution fails', async () => {
  let activeHarness: any;
  const f = fixture(event => {
    if (activeHarness?.getReport()?.stage === 'concurrent' && event.method === 'executeAsync' && /^UPDATE/.test(event.sql.trim())) throw new Error('NativeStatement.runAsync: Cannot use shared object that was already released');
  });
  activeHarness = harness(f); const result = await activeHarness.run({iterations: 7, concurrency: 3});
  expect(result.failedOperations).toBe(1);
  expect(f.statements.every(statement => statement.finalized && statement.finalizeAttempts === 1)).toBe(true);
  expect(result.cleanup.explicitStatementsFinalized).toBe(true);
  expect(result.phases[1].errorCounts['shared-object-release']).toBe(1);
});

it('records finalization errors without retrying or abandoning pending work', async () => {
  let activeHarness: any, failed = false;
  const f = fixture(event => {
    if (!failed && activeHarness?.getReport()?.stage === 'concurrent' && event.method === 'finalizeAsync') { failed = true; throw new Error('NativeStatement.finalizeAsync: Cannot use shared object that was already released'); }
  });
  activeHarness = harness(f); const result = await activeHarness.run({iterations: 7, concurrency: 3});
  expect(result.statementFinalizeFailures).toBe(1);
  expect(result.cleanup.explicitStatementsFinalized).toBe(false);
  expect(f.statements.every(statement => statement.finalizeAttempts === 1)).toBe(true);
  expect(result.cleanup.allOperationsSettled).toBe(true);
  expect(result.cleanup.deleted).toBe(true);
});

it.each(['SQLITE_BUSY: database is locked', 'SQLITE_LOCKED: database table is locked'])('reports %s independently of shared-object failures', async message => {
  let activeHarness: any;
  const f = fixture(event => { if (activeHarness?.getReport()?.stage === 'concurrent' && event.method === 'executeAsync' && /^UPDATE/.test(event.sql.trim())) throw new Error(message); });
  activeHarness = harness(f); const result = await activeHarness.run({iterations: 7, concurrency: 2});
  expect(result.failedOperations).toBe(1);
  expect(Object.keys(result.phases[1].errorCounts)).toEqual([message.startsWith('SQLITE_BUSY') ? 'sqlite-busy' : 'sqlite-locked']);
});

it('preserves the primary failure when statement finalization also rejects', async () => {
  let activeHarness: any;
  const f = fixture(event => {
    if (activeHarness?.getReport()?.stage !== 'concurrent' || !/^UPDATE/.test(event.sql.trim())) return;
    if (event.method === 'executeAsync') throw new Error('NativeStatement.runAsync: Cannot use shared object that was already released');
    if (event.method === 'finalizeAsync') throw new Error('SQLITE_BUSY: database is locked');
  });
  activeHarness = harness(f); const result = await activeHarness.run({iterations: 7, concurrency: 3});
  expect(result.phases[1].errorCounts).toEqual({'shared-object-release': 1});
  expect(result.phases[1].nativeErrorCounts).toEqual({'shared-object-release': 1, 'sqlite-busy': 1});
  expect(result.phases[1].failureSamples).toEqual(expect.arrayContaining([expect.objectContaining({stage: 'secondary-finalize-failure', category: 'sqlite-busy'})]));
  expect(result.cleanup.allOperationsSettled).toBe(true);
});

it('classifies an invalid hydrated result as an application error', async () => {
  const f = fixture(), open = f.sqlite.openDatabaseAsync.getMockImplementation()!;
  f.sqlite.openDatabaseAsync.mockImplementation(async (name: string) => {
    const db = await open(name); const get = db.getAllAsync;
    db.getAllAsync = async (sql: string, args: any[] = []) => /FROM circuit_rounds/.test(sql) ? [] : get(sql, args);
    return db;
  });
  const result = await harness(f).run({iterations: 1, concurrency: 1});
  expect(result.failedOperations).toBe(2);
  expect(result.phases[0].errorCounts).toEqual({'application-error': 1});
  expect(result.cleanup.deleted).toBe(true);
});

it('stops only after a multi-connection batch and its queued native calls settle', async () => {
  const slow = deferred(); let activeHarness: any, delayed = false;
  const f = fixture(async event => {
    if (activeHarness?.getReport()?.stage === 'multi-connection' && event.method === 'getAllAsync') { delayed = true; await slow.promise; }
  });
  activeHarness = harness(f); const run = activeHarness.run({iterations: 7, concurrency: 3, connections: 2});
  await until(() => delayed); activeHarness.requestStop();
  expect(f.events.some(event => event.method === 'closeAsync')).toBe(false);
  slow.resolve(); const result = await run;
  expect(result.state).toBe('cancelled');
  expect(result.phases[2].scheduled).toBe(3);
  expect(result.cleanup).toMatchObject({allOperationsSettled: true, connectionsClosed: 2, deleted: true});
});

it('does not delete a fixture when a connection fails to close', async () => {
  const f = fixture(event => { if (event.method === 'closeAsync' && event.connection === 1) throw new Error('NativeDatabase.closeAsync: closed resource'); });
  const result = await harness(f).run({iterations: 1, concurrency: 1, connections: 2});
  expect(result.state).toBe('failed'); expect(result.cleanup.connectionsClosed).toBe(1);
  expect(f.sqlite.deleteDatabaseAsync).not.toHaveBeenCalled();
});

it('allows only explicit workout-mode CLI selection and preserves the SELECT 1 defaults', () => {
  expect(parseArguments([])).toEqual({command: 'run', options: {iterations: 2000, concurrency: 8, allocationKiB: 0}});
  expect(parseArguments(['--mode', 'workout', '--iterations', '7', '--connections', '2'])).toEqual({command: 'run', mode: 'workout', options: {iterations: 7, concurrency: 8, allocationKiB: 0, connections: 2}});
  for (const args of [['--mode', 'bad'], ['--mode', 'workout', '--connections', '3'], ['--connections', '2'], ['--status', '--mode', 'workout']]) expect(() => parseArguments(args)).toThrow();
});

it('rejects production execution before opening a connection', () => {
  const f = fixture();
  expect(() => createWorkout({development: false, platform: 'android', sqlite: f.sqlite}, createBasic)).toThrow();
  expect(f.sqlite.openDatabaseAsync).not.toHaveBeenCalled();
});
