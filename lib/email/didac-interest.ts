function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[char]
  )
}

export const DIDAC_BROCHURE_PATH = "/brochures/edtrack-platform-brochure.pdf"
export const DIDAC_BROCHURE_FILENAME = "EdTrack-ONE-Platform-Brochure.pdf"

export function getEdtrackSiteBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_PORTFOLIO_URL?.trim() ||
    "https://edtec.online"
  return raw.replace(/\/$/, "")
}

export function buildDidacPlatformInterestEmail(name: string, baseUrl?: string): string {
  const safeName = escapeHtml(name || "there")
  const base = String(baseUrl || getEdtrackSiteBaseUrl()).replace(/\/$/, "")
  const brochureUrl = `${base}${DIDAC_BROCHURE_PATH}`
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank you for your interest in EdTrack 1 at DIDAC</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:Arial,Helvetica,sans-serif;color:#2D4635;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <tr><td style="background:#ffffff;border-radius:28px;padding:26px;border:1px solid #e8e8e0;">
          <img src="${base}/email/didac/edtrack-logo-email.png" alt="EdTrack ONE" width="180" style="display:block;border:0;margin-bottom:6px;max-width:180px;height:auto;">
          <p style="margin:0 0 16px 0;font-size:13px;font-style:italic;color:#5f6b63;">Learn. Manage. Comply. All in One.</p>
          <p style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#2D4635;font-weight:700;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#E11D48;margin-right:8px;vertical-align:middle;"></span>
            DIDAC · Platform brochure
          </p>
          <h1 style="margin:0 0 12px 0;font-size:26px;line-height:1.2;letter-spacing:-0.02em;font-weight:800;color:#2D4635;">Thank you for your interest in EdTrack 1.</h1>
          <p style="margin:0 0 10px 0;font-size:15px;line-height:1.65;color:#5f6b63;">Dear ${safeName},</p>
          <p style="margin:0 0 10px 0;font-size:15px;line-height:1.65;color:#5f6b63;">Thank you for your interest in EdTrack 1 at DIDAC.</p>
          <p style="margin:0 0 18px 0;font-size:15px;line-height:1.65;color:#5f6b63;">We are delighted to share our brochure introducing EdTrack 1, our integrated education management solution designed to streamline institutional operations, student management, academic administration, and overall operational efficiency.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 6px 0;">
            <tr>
              <td style="border-radius:999px;background:#2D4635;">
                <a href="${brochureUrl}" target="_blank" style="display:inline-block;padding:14px 26px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">Download brochure</a>
              </td>
            </tr>
          </table>
          <p style="margin:8px 0 0 0;font-size:12px;line-height:1.5;color:#6b7280;">The brochure PDF is also attached to this email.</p>

        </td></tr>

        <tr><td style="height:12px;font-size:0;">&nbsp;</td></tr>

        <tr><td style="background:#ffffff;border-radius:28px;padding:24px 26px;border:1px solid #e8e8e0;">
          <p style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#2D4635;font-weight:700;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#E11D48;margin-right:8px;vertical-align:middle;"></span>
            Your whole institution, connected
          </p>
          <h2 style="margin:0 0 12px 0;font-size:20px;font-weight:800;color:#2D4635;">One workspace for CRM, learning, finance and compliance</h2>
          <p style="margin:0;font-size:14px;line-height:1.65;color:#5f6b63;">EdTrack 1 brings institutional operations together so teams can manage students, academic delivery and administration without jumping between disconnected tools.</p>
        </td></tr>

        <tr><td style="height:12px;font-size:0;">&nbsp;</td></tr>

        <tr><td style="background:#ffffff;border-radius:28px;padding:22px 18px;border:1px solid #e8e8e0;">
          <p style="margin:0 0 14px 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#2D4635;font-weight:700;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#E11D48;margin-right:8px;vertical-align:middle;"></span>
            What EdTrack 1 supports
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" valign="top" style="padding:4px;"><table width="100%" style="background:#f7f8f4;border-radius:16px;"><tr><td style="padding:14px;"><p style="margin:0 0 4px 0;font-size:14px;font-weight:800;color:#2D4635;">Student management</p><p style="margin:0;font-size:13px;line-height:1.5;color:#5f6b63;">Enrolments, profiles and learner journeys in one place.</p></td></tr></table></td>
              <td width="50%" valign="top" style="padding:4px;"><table width="100%" style="background:#f7f8f4;border-radius:16px;"><tr><td style="padding:14px;"><p style="margin:0 0 4px 0;font-size:14px;font-weight:800;color:#2D4635;">Academic admin</p><p style="margin:0;font-size:13px;line-height:1.5;color:#5f6b63;">Scheduling, delivery and progress tracking made clearer.</p></td></tr></table></td>
            </tr>
            <tr>
              <td width="50%" valign="top" style="padding:4px;"><table width="100%" style="background:#f7f8f4;border-radius:16px;"><tr><td style="padding:14px;"><p style="margin:0 0 4px 0;font-size:14px;font-weight:800;color:#2D4635;">CRM &amp; enquiries</p><p style="margin:0;font-size:13px;line-height:1.5;color:#5f6b63;">Capture interest and follow up without losing context.</p></td></tr></table></td>
              <td width="50%" valign="top" style="padding:4px;"><table width="100%" style="background:#f7f8f4;border-radius:16px;"><tr><td style="padding:14px;"><p style="margin:0 0 4px 0;font-size:14px;font-weight:800;color:#2D4635;">Ops efficiency</p><p style="margin:0;font-size:13px;line-height:1.5;color:#5f6b63;">Reduce fragmented tools and streamline day-to-day work.</p></td></tr></table></td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="height:12px;font-size:0;">&nbsp;</td></tr>

        <tr><td style="background:#ffffff;border-radius:28px;padding:24px 26px;border:1px solid #e8e8e0;">
          <p style="margin:0 0 10px 0;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#2D4635;font-weight:700;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#E11D48;margin-right:8px;vertical-align:middle;"></span>
            Built around education
          </p>
          <h2 style="margin:0 0 16px 0;font-size:20px;font-weight:800;color:#2D4635;">Designed for institutions that want clarity and control</h2>
          <table role="presentation" width="100%" style="border-top:1px solid #eceee8;">
            <tr><td style="padding:14px 0;border-bottom:1px solid #eceee8;"><table width="100%"><tr><td width="42" style="font-size:16px;font-weight:800;color:#2D4635;">01</td><td><p style="margin:0;font-size:15px;font-weight:700;color:#2D4635;">Brochure ready</p><p style="margin:4px 0 0 0;font-size:13px;color:#5f6b63;">Download it above, or open the PDF attached to this email.</p></td></tr></table></td></tr>
            <tr><td style="padding:14px 0;"><table width="100%"><tr><td width="42" style="font-size:16px;font-weight:800;color:#2D4635;">02</td><td><p style="margin:0;font-size:15px;font-weight:700;color:#2D4635;">We’ll reach out shortly</p><p style="margin:4px 0 0 0;font-size:13px;color:#5f6b63;">Our team will understand your requirements and discuss how EdTrack 1 can support your institution.</p></td></tr></table></td></tr>
          </table>
        </td></tr>

        <tr><td style="height:12px;font-size:0;">&nbsp;</td></tr>

        <tr><td style="background:#2D4635;border-radius:28px;padding:26px 26px 20px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td valign="top" style="padding-right:16px;">
                <p style="margin:0 0 10px 0;font-size:15px;line-height:1.5;color:#e8efe9;">Let’s grow together!</p>
                <p style="margin:0 0 2px 0;font-size:13px;line-height:1.5;color:#d0ddd4;">Warm regards,</p>
                <p style="margin:0;font-size:15px;font-weight:700;color:#ffffff;">Team EdTrack 1</p>
              </td>
              <td valign="top" align="right" style="font-size:13px;line-height:1.55;color:#d7e3db;">
                <p style="margin:0 0 4px 0;font-size:14px;font-weight:700;color:#ffffff;">Aqeel Asad</p>
                <p style="margin:0 0 2px 0;"><a href="mailto:aqeel.asad@edtec.edu.au" style="color:#d7e3db;text-decoration:none;">aqeel.asad@edtec.edu.au</a></p>
                <p style="margin:0;"><a href="tel:+61475881496" style="color:#ffffff;text-decoration:none;">+61 475 881 496</a></p>
              </td>
            </tr>
          </table>
          <table width="100%" style="border-top:1px solid #3f5b49;margin-top:18px;"><tr>
            <td style="padding-top:14px;font-size:12px;color:#c5d4ca;">Learn. Manage. Comply. All in One.</td>
            <td align="right" style="padding-top:14px;font-size:12px;color:#c5d4ca;">DIDAC</td>
          </tr></table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
