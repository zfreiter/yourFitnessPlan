/** @jest-environment node */
const fs = require('node:fs');
const vm = require('node:vm');
const {patchSource} = require('../../scripts/patch-whatwg-fetch.cjs');

const sources = [
  ['UMD', fs.readFileSync(require.resolve('whatwg-fetch'), 'utf8'), true],
  ['ESM', fs.readFileSync(require.resolve('whatwg-fetch/package.json').replace('package.json', 'fetch.js'), 'utf8'), false],
] as const;

function run(source: string, status: number, event = 'load', dev = false, body: any = '', url = 'https://example.invalid/rest/v1/private?token=secret') {
  const timers: Array<() => void> = [];
  const exports: any = {};
  const warn = jest.fn();
  class XHR {
    status = status;
    statusText = '';
    response = body;
    responseURL = url;
    onload!: () => void;
    onerror!: () => void;
    ontimeout!: () => void;
    onabort!: () => void;
    open() {}
    setRequestHeader() {}
    getAllResponseHeaders() { return ''; }
    send() { (this as any)['on' + event](); }
    abort() { this.onabort(); }
  }
  // ESM exports become globals in this isolated test context.
  const context: any = {exports, module: {exports}, XMLHttpRequest: XHR, __DEV__: dev,
    console: {warn}, setTimeout: (fn: () => void) => timers.push(fn), clearTimeout() {}};
  vm.runInNewContext(source.replace(/export /g, ''), context);
  let result: any = {state: 'pending'};
  (exports.fetch || context.fetch)(url).then(
    (response: any) => { result = {state: 'resolved', response}; },
    (error: any) => { result = {state: 'rejected', error}; }
  );
  const escaped: any[] = [];
  for (const timer of timers) { try { timer(); } catch (error) { escaped.push(error); } }
  return Promise.resolve().then(() => ({result, escaped, warn}));
}

describe.each(sources)('%s fetch Response patch', (_name, source, semicolons) => {
  test('reproduces the original global throw and pending promise', async () => {
    const original = source.replace(/ *\/\/ yourFitnessPlan: reject asynchronous Response construction failures\n[\s\S]*?reject\(error\);?\n *}/, `${semicolons ? '          ' : '        '}resolve(new Response(body, options))${semicolons ? ';' : ''}`);
    expect(patchSource(original, semicolons)).toBe(source.replace(/\r\n/g, '\n'));
    const {result, escaped} = await run(original, 0);
    expect(result.state).toBe('pending');
    expect(escaped[0].name).toBe('RangeError');
  });
  test.each([0, 199, 600, NaN])('rejects invalid status %s without escaping', async status => {
    const {result, escaped} = await run(source, status);
    expect(result.state).toBe('rejected');
    expect(escaped).toEqual([]);
  });
  test.each([200, 204, 404, 599])('preserves HTTP status %s', async status => {
    const {result, escaped} = await run(source, status);
    expect(result.response.status).toBe(status);
    expect(escaped).toEqual([]);
  });
  test('catches other Response construction failures', async () => {
    const {result, escaped} = await run(source, 200, 'load', false, {get [Symbol.toStringTag]() { throw new Error('body failure'); }});
    expect(result.error.message).toBe('body failure');
    expect(escaped).toEqual([]);
  });
  test.each([['error', 'TypeError'], ['timeout', 'TypeError'], ['abort', 'AbortError']])('preserves %s rejection', async (event, name) => {
    const {result, escaped} = await run(source, 0, event);
    expect(result.error.name).toBe(name);
    expect(escaped).toEqual([]);
  });
  test('diagnostics are development-only and exclude URL and body', async () => {
    expect((await run(source, 0)).warn).not.toHaveBeenCalled();
    const {warn} = await run(source, 0, 'load', true);
    expect(warn).toHaveBeenCalledWith('[fetch-response-error]', {category: 'rest', status: 0});
    expect(JSON.stringify(warn.mock.calls)).not.toContain('secret');
  });
  test('patch is idempotent and refuses unknown source', () => {
    expect(patchSource(source, semicolons)).toBe(source.replace(/\r\n/g, '\n'));
    expect(() => patchSource('unexpected source', semicolons)).toThrow();
  });
});
