# Fetch Response error patch

`npm ci` / `npm install` runs `scripts/patch-whatwg-fetch.cjs` through
`postinstall`. No additional dependency is required. The script checks version
3.6.20 and the exact replacement site in both the ESM and UMD entry points,
preflights both files, and is idempotent. Unexpected versions or patch sites
fail installation so an upgrade requires review. Installations with lifecycle
scripts disabled must explicitly run `node scripts/patch-whatwg-fetch.cjs`
before bundling.

Only the existing XHR onload timer changes: invalid HTTP statuses reject, and
Response construction errors are caught and reject the same fetch promise.
The upstream file:// status normalization is preserved. Network errors,
timeouts, aborts, and ordinary HTTP responses retain their existing behavior.

Development builds log `[fetch-response-error]` with a fixed request category
(`auth`, `rest`, or `other`) and status only. No URL, headers, body, credentials,
or exception text is logged. Category is a path heuristic, not proof of the
request's origin. Diagnostic failures cannot prevent promise rejection.

Restart Metro with its cache cleared before testing an already-running build
so it bundles the patched dependency. This does not identify or fix the
underlying network condition. Callers still need to handle rejected fetches.
No synchronization triggers or data handling are changed.
