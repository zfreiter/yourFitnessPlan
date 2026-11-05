// Node 22+: run while an Android development build is connected to Metro.
// Uses a separate native SQLite file and separate service instances; no live Supabase calls.
const ts = require("typescript");
const start = require("./android-workout-deletion-fixture.cjs");
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Metro connection timed out")), 5000);
    socket.onopen = () => { clearTimeout(timer); resolve(); };
    socket.onerror = () => { clearTimeout(timer); reject(new Error("Metro connection failed")); };
  });
  let sequence = 0;
  async function evaluate(expression) {
    const id = ++sequence;
    const response = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Runtime evaluation timed out")), 5000);
      socket.onmessage = event => {
        const message = JSON.parse(String(event.data));
        if (message.id === id) { clearTimeout(timer); resolve(message); }
      };
      socket.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression, returnByValue: true } }));
    });
    if (response.error || response.result?.exceptionDetails)
      throw new Error(JSON.stringify(response.error ?? response.result.exceptionDetails));
    return response.result.result.value;
  }
  return { evaluate, close: () => socket.close() };
}
(async () => {
  const targets = await (await fetch("http://127.0.0.1:8081/json/list")).json();
  let runtime;
  for (const target of targets.filter(target => /com\.anonymous\.yourFitnessPlan/.test(target.title))) {
    const candidate = await connect(target.webSocketDebuggerUrl);
    try {
      if (await candidate.evaluate("typeof __r") === "function") { runtime = candidate; break; }
    } catch { /* A Metro target may describe an inactive runtime. */ }
    candidate.close();
  }
  if (!runtime) throw new Error("No active Android Metro runtime found");
  try {
    // Hermes debugger evaluation does not parse async syntax; TypeScript emits
    // equivalent ES5 state machines. Production services use their native factories.
    const compiled = ts.transpileModule(`(${start.toString()})()`, {
      compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None },
    }).outputText;
    await runtime.evaluate(`(function(){${compiled}})()`);
    for (let attempt = 0; attempt < 120; attempt++) {
      await pause(250);
      const result = JSON.parse(await runtime.evaluate("JSON.stringify(globalThis.__androidDeletionVerification)"));
      if (result.state !== "running") {
        console.log(JSON.stringify(result, null, 2));
        if (result.state !== "completed") process.exitCode = 1;
        return;
      }
    }
    throw new Error("Android fixtures did not finish within 30 seconds");
  } finally { runtime.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
