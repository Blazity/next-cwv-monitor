import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";
import { afterEach } from "vitest";

import { ipRateLimiter } from "@/app/server/lib/rate-limit";

const __dirname = import.meta.dirname;

const isCi = !!process.env.CI && process.env.CI !== "false" && process.env.CI !== "0";

const explicitEnvFile = process.env.VITEST_ENV_FILE;
const candidates = explicitEnvFile ? [explicitEnvFile] : [isCi ? ".env.ci" : ".env.test"];

const resolvedPath = candidates.map((file) => path.resolve(__dirname, file)).find((p) => fs.existsSync(p));
if (!resolvedPath) {
  throw new Error(`No env file found for integration tests. Tried: ${candidates.join(", ")}`);
}

const result = loadDotenv({ path: resolvedPath, override: true });
if (result.error) {
  throw result.error;
}

process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "silent";

afterEach(async () => {
  await ipRateLimiter.reset();
});
