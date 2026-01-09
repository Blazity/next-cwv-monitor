import { type ArkError } from "arktype";

export type ArkMessageContext = Pick<ArkError, "propString" | "expected" | "actual" | "data" | "path">;

export const createConfig = (labels: Record<string, string>) => ({
  message: (ctx: ArkMessageContext) => {
    const label = labels[ctx.propString] ?? ctx.propString;
    return `${label} must ${ctx.expected}`;
  },
});