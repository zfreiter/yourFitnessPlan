const ts = require("typescript");
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.close(); reject(new Error("Metro connection timed out")); }, 5000);
    socket.onopen = () => { clearTimeout(timer); resolve(); };
    socket.onerror = () => { clearTimeout(timer); reject(new Error("Metro connection failed")); };
  });
  let sequence = 0;
  return { close: () => socket.close(), evaluate: expression => new Promise((resolve, reject) => {
    const id = ++sequence, timer = setTimeout(() => reject(new Error("Runtime evaluation timed out")), 5000);
    socket.onmessage = event => {
      const message = JSON.parse(String(event.data));
      if (message.id === id) {
        clearTimeout(timer);
        if (message.error || message.result?.exceptionDetails) reject(new Error(JSON.stringify(message.error ?? message.result.exceptionDetails)));
        else resolve(message.result.result.value);
      }
    };
    socket.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression, returnByValue: true } }));
  }) };
}
module.exports = async function runDevelopmentExpression(expression, resultGlobal) {
  const targets = await (await fetch("http://127.0.0.1:8081/json/list", { signal: AbortSignal.timeout(5000) })).json();
  let runtime;
  for (const target of targets.filter(target => /com\.anonymous\.yourFitnessPlan/.test(target.title))) {
    const candidate = await connect(target.webSocketDebuggerUrl);
    try { if (await candidate.evaluate("typeof __r") === "function") { runtime = candidate; break; } } catch {}
    candidate.close();
  }
  if (!runtime) throw new Error("No active Android development runtime found");
  try {
    const compiled = ts.transpileModule(expression, { compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None, downlevelIteration: true } }).outputText;
    await runtime.evaluate(`(function(){${compiled}})()`);
    for (let attempt = 0; attempt < 120; attempt++) {
      await pause(500);
      const value = await runtime.evaluate(`JSON.stringify(globalThis[${JSON.stringify(resultGlobal)}])`);
      const result = value && JSON.parse(value);
      if (result && result.state !== "running") return result;
    }
    throw new Error("Development task did not finish within 60 seconds; inspect its result before retrying a mutation");
  } finally { runtime.close(); }
};
