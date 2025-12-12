import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import zxcvbn from 'zxcvbn';
import { env } from '@/env';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function validatePasswordStrength(password: string): { valid: true } | { valid: false; message: string } {
  const result = zxcvbn(password);

  if (result.score < env.NEXT_PUBLIC_MIN_PASSWORD_SCORE) {
    const feedback = result.feedback.warning || result.feedback.suggestions[0] || 'Please choose a stronger password';
    return { valid: false, message: feedback };
  }

  return { valid: true };
}
