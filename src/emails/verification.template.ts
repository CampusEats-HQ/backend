import { baseLayout } from './base.template';

export function verificationTemplate(firstName: string, otp: string, expiryMinutes: string | number): string {
  const spaced = otp.split('').join('&nbsp;&nbsp;');

  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111111">Welcome to CampusEats, ${firstName}!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#444444;line-height:1.6">
      You're almost in! Use the code below to finish setting up your account.
    </p>

    <div style="background:#f0f0ff;border:2px solid #6366f1;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6366f1;letter-spacing:1px;text-transform:uppercase">Your verification code</p>
      <p style="margin:0;font-size:40px;font-weight:800;letter-spacing:6px;color:#111111;font-variant-numeric:tabular-nums">${spaced}</p>
    </div>

    <p style="margin:0 0 24px;font-size:14px;color:#666666">
      This code expires in <strong>${expiryMinutes} minutes</strong>. Don't share it with anyone.
    </p>

    <p style="margin:0;font-size:13px;color:#aaaaaa">If you didn't create a CampusEats account, you can safely ignore this email.</p>
  `);
}
