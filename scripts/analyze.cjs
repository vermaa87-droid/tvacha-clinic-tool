/* Cross-platform `ANALYZE=true next build`. Lets the @next/bundle-analyzer
 * wrapper in next.config.js emit its HTML reports without us having to add
 * cross-env as a dependency or write OS-specific shell syntax. */
process.env.ANALYZE = "true";
const { spawnSync } = require("child_process");
const result = spawnSync("npx", ["next", "build"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});
process.exit(result.status ?? 0);
