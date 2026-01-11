import { type ArkError } from "arktype";

export type ArkMessageContext = Pick<ArkError, "propString" | "expected" | "actual" | "data" | "path">;

export const createConfig = (labels: Record<string, string>) => ({
  message: (ctx: ArkMessageContext) => {
    const prop = ctx.propString || "(root)";
    const label = labels[prop] ?? prop;
    return `${label} must ${ctx.expected}`;
  },
});