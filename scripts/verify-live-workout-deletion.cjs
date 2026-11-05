const fs = require("fs");
const run = require("./metro-development-runtime.cjs");
const start = require("./android-live-workout-deletion-validation.cjs");
const args = process.argv.slice(2);
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const roundtrip = args.includes("--roundtrip");
const confirmation = option("--confirm");
if (roundtrip && confirmation !== "CREATE AND DELETE ONE DISPOSABLE WORKOUT") {
  console.error("Roundtrip requires --confirm \"CREATE AND DELETE ONE DISPOSABLE WORKOUT\""); process.exit(1);
}
run(`(${start.toString()})(${JSON.stringify({ roundtrip, confirmation })})`, "__liveWorkoutDeletionValidation").then(result => {
  console.log(JSON.stringify(result, null, 2));
  if (option("--report")) fs.writeFileSync(option("--report"), JSON.stringify(result, null, 2) + "\n");
  if (result.state !== "completed") process.exitCode = 1;
}).catch(error => { console.error(error.message); process.exitCode = 1; });
