import { baseLayout, ctaButton } from './base.template';

export function riderCredentialsTemplate(name: string, email: string, password: string): string {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111111">You're approved! Start delivering</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#444444;line-height:1.6">
      Welcome to the team, ${name}! Your rider account is ready. Here are your login credentials:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;border:1px solid #e5e5e5;margin-bottom:8px">
      <tr style="background:#f9f9ff">
        <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#555555;width:40%">Email</td>
        <td style="padding:12px 16px;font-size:13px;color:#111111">${email}</td>
      </tr>
      <tr style="border-top:1px solid #e5e5e5">
        <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#555555">Temporary password</td>
        <td style="padding:12px 16px;font-size:13px;color:#111111;font-family:monospace">${password}</td>
      </tr>
    </table>

    <p style="margin:0 0 4px;font-size:13px;color:#888888">Please change your password after your first login.</p>

    ${ctaButton('Go to Rider Portal', `${process.env.FRONTEND_URL ?? 'https://app.campus-eats.me'}/rider/login`)}
  `);
}
