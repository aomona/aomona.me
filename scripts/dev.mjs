import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync, unlinkSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const instance = randomUUID();
const distDir = `.next-dev/${instance}`;
const tsconfigPath = `.tsconfig.dev-${instance}.json`;

// Keep relative source paths rooted in the project, and let Next update only
// this disposable configuration instead of the shared tsconfig.json.
writeFileSync(
  tsconfigPath,
  JSON.stringify({
    extends: "./tsconfig.json",
    compilerOptions: { tsBuildInfoFile: `${distDir}/tsconfig.tsbuildinfo` },
    include: ["next-env.d.ts", "src/**/*.ts", "src/**/*.tsx", `${distDir}/dev/types/**/*.ts`],
    exclude: ["node_modules"],
  }),
);

const child = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "dev", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      AOMONA_DEV_DIST_DIR: distDir,
      AOMONA_DEV_TSCONFIG: tsconfigPath,
    },
  },
);

function cleanup() {
  unlinkSync(tsconfigPath);
}
child.on("error", (error) => {
  console.error(error);
  cleanup();
  process.exitCode = 1;
});
child.on("exit", (code) => {
  cleanup();
  process.exitCode = code ?? 0;
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
