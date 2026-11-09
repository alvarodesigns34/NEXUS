import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const flags = process.argv.slice(2).filter(flag => flag !== "--strictPort").map(flag => flag === "--host" ? "--hostname" : flag);
const next = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", ...flags], { stdio: "inherit" });
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => next.kill(signal));
next.on("exit", (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
