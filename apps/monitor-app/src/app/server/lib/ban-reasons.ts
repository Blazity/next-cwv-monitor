export const BAN_REASONS = {
  disableAccount: "DISABLED",
} as const;

export type BanReasonKey = keyof typeof BAN_REASONS;
export type BanReasonValue = (typeof BAN_REASONS)[BanReasonKey];

export function checkBanReason(value: string | undefined | null, reason: BanReasonKey) {
  return value === BAN_REASONS[reason];
}
