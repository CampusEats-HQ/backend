import { resend } from '../config/mailer';

const FROM = process.env.RESEND_FROM ?? 'CampusEats <noreply@campuseats.ng>';

export async function sendOTPEmail(email: string, otp: string, type: 'verification' | 'reset'): Promise<void> {
  const subject = type === 'verification' ? 'Verify your CampusEats account' : 'Reset your CampusEats password';
  const action = type === 'verification' ? 'verify your email' : 'reset your password';

  await resend.emails.send({
    from: FROM,
    to: email,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#e85d04">CampusEats</h2>
        <p>Use the code below to ${action}. It expires in ${process.env.OTP_EXPIRY_MINUTES ?? 10} minutes.</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f4f4f4;text-align:center;border-radius:8px">
          ${otp}
        </div>
        <p style="color:#888;font-size:12px;margin-top:16px">If you did not request this, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendRiderCredentials(email: string, name: string, password: string): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Your CampusEats Rider Account Is Ready',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#e85d04">Welcome, ${name}!</h2>
        <p>Your rider application has been approved. Here are your login credentials:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;font-weight:bold">Email</td><td style="padding:8px">${email}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Password</td><td style="padding:8px">${password}</td></tr>
        </table>
        <p>Please change your password after your first login.</p>
      </div>
    `,
  });
}

export async function sendVendorCredentials(email: string, name: string, password: string): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Your CampusEats Vendor Account Is Ready',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#e85d04">Welcome, ${name}!</h2>
        <p>Your vendor account has been created on CampusEats. Here are your login credentials:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;font-weight:bold">Email</td><td style="padding:8px">${email}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Password</td><td style="padding:8px">${password}</td></tr>
        </table>
        <p>Log in at the vendor portal and change your password immediately.</p>
      </div>
    `,
  });
}
