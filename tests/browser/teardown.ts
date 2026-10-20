import { execFileSync } from "node:child_process";

export default function teardown() {
  execFileSync(process.execPath, ["--import", "tsx", "tests/browser/seed.ts", "--cleanup"], {
    stdio: "inherit", env: process.env,
  });
}
