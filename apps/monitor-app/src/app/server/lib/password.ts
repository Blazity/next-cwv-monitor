import { randomInt } from "node:crypto";

function pick(str: string) {
  return str[randomInt(0, str.length)];
}

function shuffle(arr: string[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateTempPassword(length = 16) {
  if (length < 12) throw new Error("Use length >= 12 for decent security.");

  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const symbols = "!@#$%^&*()-_=+[]{};:,.?";

  const all = lower + upper + digits + symbols;

  const chars = [pick(lower), pick(upper), pick(digits), pick(symbols)];

  while (chars.length < length) chars.push(pick(all));

  return shuffle(chars).join("");
}
