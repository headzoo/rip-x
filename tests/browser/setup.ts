import { execFileSync } from "node:child_process";

export default function setup() {
  // Prisma's generated ESM is loaded by tsx, not Playwright's CJS transform.
  execFileSync(process.execPath, ["--import", "tsx", "tests/browser/seed.ts"], {
    stdio: "inherit", env: process.env,
  });
}
