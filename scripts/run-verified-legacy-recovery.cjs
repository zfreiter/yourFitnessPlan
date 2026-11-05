// Preview is the default. Apply requires the administrator's matching-project
// absence verification and explicit confirmation of these exact four queue IDs.
const fs = require("fs");
const run = require("./metro-development-runtime.cjs");
const createRecovery = require("./verified-legacy-queue-recovery.cjs");
const start = require("./android-verified-legacy-recovery.cjs");
const args = process.argv.slice(2);
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const apply = args.includes("--apply");
const adminProjectRef = option("--admin-project-ref");
const confirmation = option("--confirm");
if (apply && (adminProjectRef !== createRecovery().projectRef || confirmation !== "CANCEL EXACTLY 287 288 289 290" || !args.includes("--admin-verified-absent"))) {
  console.error("Apply requires --admin-project-ref bojjxwudhkvcjipglwps --admin-verified-absent --confirm \"CANCEL EXACTLY 287 288 289 290\"");
  process.exit(1);
}
const options = { apply, adminProjectRef, confirmation, bypassesRls: apply, globallyAbsent: apply };
run(`(${start.toString()})(${createRecovery.toString()},${JSON.stringify(options)})`, "__verifiedLegacyRecovery").then(result => {
  console.log(JSON.stringify(result, null, 2));
  if (option("--report")) fs.writeFileSync(option("--report"), JSON.stringify(result, null, 2) + "\n");
  if (result.state === "failed") process.exitCode = 1;
}).catch(error => { console.error(error.message); process.exitCode = 1; });
