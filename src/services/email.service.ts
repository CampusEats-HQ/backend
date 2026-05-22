import { resend } from '../config/mailer';
import { verificationTemplate } from '../emails/verification.template';
import { resetPasswordTemplate } from '../emails/resetPassword.template';
import { riderCredentialsTemplate } from '../emails/riderCredentials.template';
import { vendorCredentialsTemplate } from '../emails/vendorCredentials.template';

const FROM = process.env.RESEND_FROM ?? 'CampusEats <noreply@campuseats.ng>';
const EXPIRY = process.env.OTP_EXPIRY_MINUTES ?? 15;

export async function sendOTPEmail(email: string, otp: string, type: 'verification' | 'reset', firstName?: string): Promise<void> {
  const subject = type === 'verification' ? 'Finish setting up your CampusEats account' : 'Reset your CampusEats password';
  const html = type === 'verification'
    ? verificationTemplate(firstName ?? 'there', otp, EXPIRY)
    : resetPasswordTemplate(otp, EXPIRY);

  await resend.emails.send({ from: FROM, to: email, subject, html });
}

export async function sendRiderCredentials(email: string, name: string, password: string): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Your CampusEats Rider Account Is Ready',
    html: riderCredentialsTemplate(name, email, password),
  });
}

export async function sendVendorCredentials(email: string, name: string, password: string): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Your CampusEats Vendor Account Is Ready',
    html: vendorCredentialsTemplate(name, email, password),
  });
}
