// Synthetic workload only. Serialized into Hermes; imports no production services.
module.exports = function createWorkoutConcurrencyHarness(dependencies, createBasicHarness) {
  const basic = createBasicHarness(dependencies);
  const now = dependencies.now || Date.now;
  const yieldTask = dependencies.yieldTask || (() => new Promise(resolve => setTimeout(resolve, 0)));
  const owner = 'sqlite-repro-owner';
  const kinds = ['workout-hydration', 'exercise-service-read', 'circuit-service-read', 'cardio-service-read', 'parallel-service-reads', 'prepared-set-read', 'prepared-set-update'];
  let running = false, stopped = false, report = null;
  function validate(options = {}) {
    if (Object.keys(options).some(key => !['iterations', 'concurrency', 'allocationKiB', 'connections'].includes(key))) throw new Error('Unknown workout workload option');
    const config = basic.validate({iterations: options.iterations ?? 120, concurrency: options.concurrency, allocationKiB: options.allocationKiB});
    const connections = options.connections ?? 1;
    if (![1, 2].includes(connections)) throw new Error('connections must be 1 or 2');
    return {...config, connections};
  }
  function sanitize(error) {
    try {
      if (error?.message === 'Synthetic workout invariant failed') return {category: 'application-error', code: null, nativeMethod: null, sharedObjectReleased: false, message: 'Synthetic workout data or lifecycle invariant failed.'};
    } catch { /* Native error accessors must not interrupt draining. */ }
    return basic.sanitize(error);
  }
  const check = condition => { if (!condition) throw new Error('Synthetic workout invariant failed'); };
  const emit = () => { try { dependencies.onProgress?.(report); } catch {} };
  function requestStop() { if (!running) return false; stopped = true; report.stopRequested = true; emit(); return true; }

  async function run(options = {}) {
    const config = validate(options);
    if (running) throw new Error('Workout concurrency reproduction is already running');
    const sqlite = dependencies.sqlite;
    if (!sqlite?.openDatabaseAsync || !sqlite?.deleteDatabaseAsync) throw new Error('Expo SQLite APIs are unavailable');
    running = true; stopped = false;
    const started = now(), filename = `sqlite-workout-repro-${Date.now()}-${Math.random().toString(16).slice(2) || '0'}.db`;
    const handles = [], statements = new Set(), pressure = [null, null];
    let activeBatch = [], terminal = 'completed', allocationIndex = 0, activeCalls = 0, limit = 1;
    const waiters = [];
    report = {state: 'running', stage: 'setup', mode: 'synthetic-workouts', filename, config, stopRequested: false,
      phases: [], inFlight: 0, peakSqliteCalls: 0, sqliteCallsInFlight: 0, failedOperations: 0, elapsedMs: 0,
      statementsPrepared: 0, statementsFinalized: 0, statementFinalizeFailures: 0, forcedGC: false, allocationBytesGenerated: 0,
      cleanup: {opened: false, connectionsOpened: 0, connectionsClosed: 0, allOperationsSettled: false, closed: false, deleted: false}};
    emit();
    function take() {
      if (activeCalls < limit) { activeCalls++; return Promise.resolve(); }
      return new Promise(resolve => waiters.push(resolve));
    }
    function give() { if (waiters.length) waiters.shift()(); else activeCalls--; }
    function sample(phase, error, iteration, kind, stage) {
      if (phase.failureSamples.length < 20) phase.failureSamples.push({iteration, operation: kind, stage, ...sanitize(error)});
    }
    async function call(phase, api, task) {
      if (phase) {
        phase.sqliteCallsScheduled++;
        phase.sqliteApiCounts[api] = (phase.sqliteApiCounts[api] || 0) + 1;
      }
      await take();
      report.sqliteCallsInFlight++;
      report.peakSqliteCalls = Math.max(report.peakSqliteCalls, report.sqliteCallsInFlight);
      if (phase) phase.peakSqliteCalls = Math.max(phase.peakSqliteCalls, report.sqliteCallsInFlight);
      try { return await task(); }
      catch (error) {
        if (phase) {
          const category = sanitize(error).category;
          phase.nativeErrorCounts[category] = (phase.nativeErrorCounts[category] || 0) + 1;
        }
        throw error;
      } finally {
        if (phase) phase.sqliteCallsCompleted++;
        report.sqliteCallsInFlight--; give();
      }
    }
    const all = async tasks => {
      // Never let a failed branch leave sibling native requests running.
      const results = await Promise.all(tasks.map(task => Promise.resolve().then(task).then(value => ({value}), error => ({error}))));
      const failed = results.find(result => Object.prototype.hasOwnProperty.call(result, 'error'));
      if (failed) throw failed.error;
      return results.map(result => result.value);
    };
    async function prepared(db, sql, phase, iteration, kind, body) {
      const statement = await call(phase, 'prepareAsync', () => db.prepareAsync(sql));
      statements.add(statement); report.statementsPrepared++;
      let primaryFailed = false;
      try { return await body(statement); }
      catch (error) { primaryFailed = true; throw error; }
      finally {
        try {
          await call(phase, 'finalizeAsync', () => statement.finalizeAsync());
          statements.delete(statement); report.statementsFinalized++;
        } catch (error) {
          report.statementFinalizeFailures++;
          if (primaryFailed && phase) sample(phase, error, iteration, kind, 'secondary-finalize-failure');
          if (!primaryFailed) throw error;
        }
      }
    }
    const rows = (db, phase, sql, args = []) => call(phase, 'getAllAsync', () => db.getAllAsync(sql, args));
    const setQuery = `SELECT es.* FROM exercise_sets es
      JOIN workout_exercises we ON we.id = es.workout_exercise_id
      JOIN workouts w ON w.id = we.workout_id
      WHERE es.workout_exercise_id = ? AND w.user_id = ? ORDER BY es.set_order`;
    async function exercises(db, phase, workoutId) {
      const list = await rows(db, phase, `SELECT we.id, we.workout_id, we.exercise_id, we.exercise_name,
        we.valid_units, we.muscles_targeted, we.equipment, we.description, we.exercise_order,
        we.group_id, we.group_type, we.round_number, we.circuit_id FROM workout_exercises we
        JOIN workouts w ON w.id = we.workout_id WHERE we.workout_id = ? AND w.user_id = ? ORDER BY we.exercise_order, we.rowid`, [workoutId, owner]);
      for (const exercise of list) {
        exercise.sets = await rows(db, phase, setQuery, [exercise.id, owner]);
        check(exercise.sets.length === 3 && exercise.sets.every(set => set.workout_exercise_id === exercise.id && set.reps === 12));
      }
      check(list.length === (workoutId === 'w3' ? 0 : 2));
      return list;
    }
    async function circuits(db, phase, workoutId) {
      const list = await rows(db, phase, `SELECT cr.* FROM circuit_rounds cr JOIN workouts w ON w.id = cr.workout_id
        WHERE cr.workout_id = ? AND w.user_id = ? ORDER BY cr.round_number`, [workoutId, owner]);
      check(list.length === (workoutId === 'w1' ? 1 : 0));
      return list;
    }
    async function cardio(db, phase, workoutId) {
      const list = await rows(db, phase, `SELECT ce.* FROM cardio_entries ce JOIN workouts w ON w.id = ce.workout_id
        WHERE ce.workout_id = ? AND w.user_id = ? ORDER BY ce.entry_order`, [workoutId, owner]);
      check(list.length === 1);
      for (const entry of list) {
        entry.intervals = await rows(db, phase, `SELECT ci.* FROM cardio_intervals ci
          JOIN cardio_entries ce ON ce.id = ci.cardio_entry_id JOIN workouts w ON w.id = ce.workout_id
          WHERE ci.cardio_entry_id = ? AND w.user_id = ? ORDER BY ci.interval_order`, [entry.id, owner]);
        check(entry.intervals.length === 4 && entry.intervals.every(interval => interval.cardio_entry_id === entry.id && interval.work_duration === 30));
      }
      return list;
    }
    async function workload(db, phase, iteration, kind) {
      const workoutId = `w${1 + ((iteration - 1) % 3)}`;
      if (kind === 'workout-hydration') {
        const list = await rows(db, phase, `SELECT id, user_id, name, description, type, scheduled_datetime,
          duration, perceived_effort, is_completed, completed_at FROM workouts WHERE user_id = ? ORDER BY scheduled_datetime`, [owner]);
        check(list.length === 3);
        for (const workout of list) {
          const members = await exercises(db, phase, workout.id);
          await cardio(db, phase, workout.id);
          const rounds = await circuits(db, phase, workout.id);
          check(workout.user_id === owner && members.every(exercise => exercise.group_type !== 'circuit' || rounds.some(round => round.id === exercise.circuit_id && round.round_number === exercise.round_number)));
        }
      } else if (kind === 'exercise-service-read') await exercises(db, phase, workoutId);
      else if (kind === 'circuit-service-read') await circuits(db, phase, workoutId);
      else if (kind === 'cardio-service-read') await cardio(db, phase, workoutId);
      else if (kind === 'parallel-service-reads') await all([
        () => exercises(db, phase, workoutId), () => circuits(db, phase, workoutId), () => cardio(db, phase, workoutId),
      ]);
      else if (kind === 'prepared-set-read') await prepared(db, setQuery, phase, iteration, kind, async statement => {
        for (const id of ['w1e1', 'w2e1']) {
          const result = await call(phase, 'executeAsync', () => statement.executeAsync([id, owner]));
          const sets = await call(phase, 'result.getAllAsync', () => result.getAllAsync());
          check(sets.length === 3 && sets.every(set => set.workout_exercise_id === id));
        }
      });
      else await prepared(db, `UPDATE exercise_sets SET reps=?, weight=?, time=?, distance=?,
        is_warmup=?, is_max=?, set_order=? WHERE id=?`, phase, iteration, kind, async statement => {
        // Idempotent values keep all read invariants stable while exercising writes.
        for (let index = 1; index <= 3; index++) {
          const result = await call(phase, 'executeAsync', () => statement.executeAsync([12, 20, null, null, 0, 0, index, `w1e1s${index}`]));
          check(result.changes === 1);
        }
      });
    }
    async function setup(db) {
      await db.execAsync(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=1000;
        CREATE TABLE workouts(id TEXT PRIMARY KEY,user_id TEXT,name TEXT,description TEXT,type TEXT,scheduled_datetime TEXT,duration INTEGER,perceived_effort TEXT,is_completed INTEGER,completed_at TEXT);
        CREATE TABLE exercises(id TEXT PRIMARY KEY,name TEXT);
        CREATE TABLE circuit_rounds(id TEXT PRIMARY KEY,workout_id TEXT REFERENCES workouts(id),round_number INTEGER,rest_after_round INTEGER,notes TEXT);
        CREATE TABLE workout_exercises(id TEXT PRIMARY KEY,workout_id TEXT REFERENCES workouts(id),exercise_id TEXT REFERENCES exercises(id),exercise_name TEXT,valid_units TEXT,muscles_targeted TEXT,equipment TEXT,description TEXT,exercise_order INTEGER,group_id TEXT,group_type TEXT,round_number INTEGER,circuit_id TEXT REFERENCES circuit_rounds(id));
        CREATE TABLE exercise_sets(id TEXT PRIMARY KEY,workout_exercise_id TEXT REFERENCES workout_exercises(id),reps INTEGER,weight REAL,time REAL,distance REAL,is_warmup INTEGER,is_max INTEGER,set_order INTEGER);
        CREATE TABLE cardio_entries(id TEXT PRIMARY KEY,workout_id TEXT REFERENCES workouts(id),activity TEXT,mode TEXT,duration REAL,distance REAL,calories REAL,heart_rate_avg REAL,heart_rate_zone INTEGER,is_finisher INTEGER,entry_order INTEGER,notes TEXT);
        CREATE TABLE cardio_intervals(id TEXT PRIMARY KEY,cardio_entry_id TEXT REFERENCES cardio_entries(id),interval_order INTEGER,work_duration REAL,rest_duration REAL,distance REAL,calories REAL,notes TEXT);`);
      await db.runAsync("INSERT INTO exercises VALUES ('catalog','Synthetic exercise')");
      for (const id of ['w1', 'w2', 'w3', 'other']) {
        await db.runAsync('INSERT INTO workouts VALUES (?,?,?,?,?,?,?,?,?,?)', [id, id === 'other' ? 'other-synthetic-owner' : owner, 'Synthetic workout', '', id === 'w1' ? 'circuit' : id === 'w2' ? 'strength' : 'cardio', `2035-04-0${id === 'other' ? 9 : id.slice(1)}T12:00:00Z`, 20, 'easy', 0, null]);
        if (id === 'other') continue;
        if (id === 'w1') await db.runAsync("INSERT INTO circuit_rounds VALUES ('round','w1',3,60,'Synthetic')");
        if (id !== 'w3') for (let e = 1; e <= 2; e++) {
          const exerciseId = `${id}e${e}`;
          await db.runAsync('INSERT INTO workout_exercises VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [exerciseId, id, 'catalog', 'Synthetic exercise', '["reps","weight"]', '', '', '', e - 1, id === 'w1' ? 'round' : null, id === 'w1' ? 'circuit' : 'standalone', id === 'w1' ? 3 : null, id === 'w1' ? 'round' : null]);
          for (let s = 1; s <= 3; s++) await db.runAsync('INSERT INTO exercise_sets VALUES (?,?,?,?,?,?,?,?,?)', [`${exerciseId}s${s}`, exerciseId, 12, 20, null, null, 0, 0, s]);
        }
        await db.runAsync('INSERT INTO cardio_entries VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [`${id}cardio`, id, 'sprint', 'intervals', null, null, null, null, null, 0, 0, 'Synthetic']);
        for (let index = 1; index <= 4; index++) await db.runAsync('INSERT INTO cardio_intervals VALUES (?,?,?,?,?,?,?,?)', [`${id}interval${index}`, `${id}cardio`, index, 30, 60, null, null, 'Synthetic']);
      }
      report.fixture = {ownedWorkouts: 3, otherOwnerWorkouts: 1, exercises: 4, sets: 12, circuits: 1, cardioEntries: 3, intervals: 12};
    }
    async function operation(db, phase, iteration) {
      const kind = kinds[(iteration - 1) % kinds.length];
      phase.operationCounts[kind] = (phase.operationCounts[kind] || 0) + 1;
      report.inFlight++; phase.maxInFlight = Math.max(phase.maxInFlight, report.inFlight);
      try {
        if (config.allocationKiB) {
          const bytes = new Uint8Array(config.allocationKiB * 1024); bytes[0] = allocationIndex & 255;
          pressure[allocationIndex++ % 2] = bytes; report.allocationBytesGenerated += bytes.length;
        }
        await workload(db, phase, iteration, kind); phase.succeeded++;
      } catch (error) {
        phase.failed++; report.failedOperations++;
        const category = sanitize(error).category;
        phase.errorCounts[category] = (phase.errorCounts[category] || 0) + 1;
        sample(phase, error, iteration, kind, 'operation');
      } finally { phase.completed++; report.inFlight--; }
    }
    try {
      for (let index = 0; index < config.connections; index++) {
        const db = await sqlite.openDatabaseAsync(filename, {useNewConnection: true});
        handles.push(db); report.cleanup.opened = true; report.cleanup.connectionsOpened++;
        check(typeof db.databasePath === 'string' && db.databasePath.replace(/\\/g, '/').endsWith('/' + filename));
        if (index === 0) await setup(db);
        else await db.execAsync('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=1000;');
      }
      const phases = [['sequential', 1, 1], ['concurrent', config.concurrency, 1]];
      if (config.connections === 2) phases.push(['multi-connection', config.concurrency, 2]);
      for (const [name, concurrency, connections] of phases) {
        if (stopped) { terminal = 'cancelled'; break; }
        check(activeCalls === 0 && waiters.length === 0); limit = concurrency;
        const phaseStart = now(), phase = {name, concurrency, connections, requested: config.iterations,
          scheduled: 0, completed: 0, succeeded: 0, failed: 0, maxInFlight: 0, peakSqliteCalls: 0,
          sqliteCallsScheduled: 0, sqliteCallsCompleted: 0, sqliteApiCounts: {}, nativeErrorCounts: {}, operationCounts: {}, errorCounts: {}, failureSamples: [], elapsedMs: 0};
        report.phases.push(phase); report.stage = name; emit();
        while (phase.scheduled < config.iterations && !stopped) {
          activeBatch = [];
          const size = Math.min(concurrency, config.iterations - phase.scheduled);
          for (let index = 0; index < size; index++) {
            const iteration = ++phase.scheduled;
            activeBatch.push(operation(handles[(iteration - 1) % connections], phase, iteration));
          }
          await Promise.all(activeBatch); activeBatch = [];
          phase.elapsedMs = Math.max(0, now() - phaseStart); report.elapsedMs = Math.max(0, now() - started); emit();
          await yieldTask();
        }
        phase.elapsedMs = Math.max(0, now() - phaseStart);
        if (stopped) { terminal = 'cancelled'; break; }
      }
    } catch (error) { terminal = 'failed'; report.fatalError = sanitize(error); }
    finally {
      report.stage = 'cleanup'; emit();
      await Promise.all(activeBatch.map(promise => promise.then(() => {}, () => {})));
      report.cleanup.allOperationsSettled = report.inFlight === 0 && report.sqliteCallsInFlight === 0 && activeCalls === 0 && waiters.length === 0;
      report.cleanup.explicitStatementsFinalized = statements.size === 0;
      pressure[0] = pressure[1] = null;
      report.cleanup.errors = [];
      if (report.cleanup.allOperationsSettled) for (const db of [...handles].reverse()) {
        if (typeof db.databasePath !== 'string' || !db.databasePath.replace(/\\/g, '/').endsWith('/' + filename)) { terminal = 'failed'; continue; }
        try { await db.closeAsync(); report.cleanup.connectionsClosed++; }
        catch (error) { terminal = 'failed'; report.cleanup.errors.push(sanitize(error)); }
      }
      report.cleanup.closed = handles.length > 0 && report.cleanup.connectionsOpened === report.cleanup.connectionsClosed;
      if (report.cleanup.closed) {
        try { await sqlite.deleteDatabaseAsync(filename); report.cleanup.deleted = true; }
        catch (error) { terminal = 'failed'; report.cleanup.errors.push(sanitize(error)); }
      }
      statements.clear(); handles.length = 0;
      report.elapsedMs = Math.max(0, now() - started); report.stage = 'finished'; report.state = terminal; running = false; emit();
    }
    return report;
  }
  return {validate, sanitize, run, requestStop, isRunning: () => running, getReport: () => report};
};
