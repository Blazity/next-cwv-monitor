import pino from "pino";
import { env } from "@/env";

const level = env.LOG_LEVEL;

export const logger = pino({
  level,
  base: undefined,
});
