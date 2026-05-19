import crypto from 'crypto';

export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function otpExpiresAt(): Date {
  const mins = Number(process.env.OTP_EXPIRY_MINUTES) || 10;
  return new Date(Date.now() + mins * 60 * 1000);
}
