// Keep this narrowly scoped patch until upstream catches asynchronous Response errors.
const fs = require('node:fs');
const path = require('node:path');

const version = '3.6.20';
const marker = '// yourFitnessPlan: reject asynchronous Response construction failures';

function patchSource(source, semicolons) {
  const normalized = source.replace(/\r\n/g, '\n');
  const indent = semicolons ? '          ' : '        ';
  const end = semicolons ? ';' : '';
  const original = `${indent}resolve(new Response(body, options))${end}`;
  const replacement = [
    `${indent}${marker}`,
    `${indent}try {`,
    `${indent}  if (typeof options.status !== 'number' || !isFinite(options.status) || options.status < 200 || options.status > 599) {`,
    `${indent}    throw new TypeError('Network request failed: invalid response status')${end}`,
    `${indent}  }`,
    `${indent}  resolve(new Response(body, options))${end}`,
    `${indent}} catch (error) {`,
    `${indent}  try {`,
    `${indent}    if (typeof __DEV__ !== 'undefined' && __DEV__ && typeof console !== 'undefined') {`,
    `${indent}      var category = /\\/auth\\/v1(?:\\/|[?#]|$)/.test(request.url) ? 'auth' : /\\/rest\\/v1(?:\\/|[?#]|$)/.test(request.url) ? 'rest' : 'other'${end}`,
    `${indent}      console.warn('[fetch-response-error]', {category: category, status: typeof options.status === 'number' ? options.status : 'non-numeric'})${end}`,
    `${indent}    }`,
    `${indent}  } catch (diagnosticError) { /* Diagnostics must never prevent rejection. */ }`,
    `${indent}  reject(error)${end}`,
    `${indent}}`
  ].join('\n');
  if (normalized.includes(marker)) {
    if (!normalized.includes(replacement)) throw new Error('Unexpected partial whatwg-fetch patch');
    return normalized;
  }
  if (normalized.split(original).length !== 2) throw new Error('Unexpected whatwg-fetch source; review patch');
  return normalized.replace(original, replacement);
}

function applyPatch(projectRoot = path.resolve(__dirname, '..')) {
  const packagePaths = new Set([
    require.resolve('whatwg-fetch/package.json', {paths: [projectRoot]}),
    require.resolve('whatwg-fetch/package.json', {paths: [path.dirname(require.resolve('react-native/package.json', {paths: [projectRoot]}))]})
  ]);
  const writes = [];
  for (const packagePath of packagePaths) {
    if (JSON.parse(fs.readFileSync(packagePath, 'utf8')).version !== version) {
      throw new Error(`whatwg-fetch version changed; review ${version} patch before installing`);
    }
    for (const [relative, semicolons] of [['fetch.js', false], ['dist/fetch.umd.js', true]]) {
      const file = path.join(path.dirname(packagePath), relative);
      const source = fs.readFileSync(file, 'utf8');
      const patched = patchSource(source, semicolons);
      if (source !== patched) writes.push([file, patched]);
    }
  }
  for (const [file, patched] of writes) fs.writeFileSync(file, patched);
  return writes.length;
}

module.exports = {applyPatch, patchSource};
if (require.main === module) console.log(`whatwg-fetch ${version}: patched ${applyPatch()} files`);
