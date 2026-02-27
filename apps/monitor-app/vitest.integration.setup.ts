import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";

const __dirname = import.meta.dirname;

const isCi = !!process.env.CI && process.env.CI !== "false" && process.env.CI !== "0";
const explicitEnvFile = process.env.VITEST_ENV_FILE;
const candidates = explicitEnvFile ? [explicitEnvFile] : [isCi ? ".env.ci" : ".env.test"];

const resolvedPath = candidates.map((file) => path.resolve(__dirname, file)).find((p) => fs.existsSync(p));
if (!resolvedPath) {
  throw new Error(`No env file found for integration tests. Tried: ${candidates.join(", ")}`);
}

loadDotenv({ path: resolvedPath, override: true });

const configPath = path.resolve(process.cwd(), ".vitest-ch-config.json");
if (fs.existsSync(configPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    process.env.TEST_CH_HOST = config.host;
    process.env.TEST_CH_PORT = String(config.port);
  } catch (error) {
    console.error("Failed to read .vitest-ch-config.json", error);
  }
}

process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? "silent";
