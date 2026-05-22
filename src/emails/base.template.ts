export function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">

          <!-- Header -->
          <tr>
            <td style="background:#6366f1;padding:20px 32px">
              <img src="https://staging.campus-eats.me/logo.png" alt="CampusEats" height="36" style="display:block;border:0" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:20px 32px;border-top:1px solid #eeeeee">
              <p style="margin:0;font-size:12px;color:#999999;line-height:1.6">
                © 2025 CampusEats · University of Lagos<br/>
                Questions? <a href="mailto:support@campus-eats.me" style="color:#6366f1;text-decoration:none">support@campus-eats.me</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function ctaButton(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;padding:14px 32px;background:#6366f1;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px">${label}</a>`;
}
