/**
 * Support acknowledgement email template
 * Sent to students when they submit a support ticket
 * Design based on EdTec brand: primary #1E549F, secondary #C4202B, accent #F5C23C, success #158057
 */

export interface SupportAcknowledgementTemplateData {
  studentName: string;
  ticketReference: string;
  /** Optional: logo URL (full URL for email) */
  logoUrl?: string;
  /** Optional: support URL for help center and FAQs links */
  supportUrl?: string;
}

export function generateSupportAcknowledgementEmailTemplate(
  data: SupportAcknowledgementTemplateData
): string {
  const { studentName, ticketReference, logoUrl, supportUrl = '#' } = data;

  const primary = '#1E549F';
  const secondary = '#C4202B';
  const accent = '#F5C23C';
  const success = '#158057';
  const gradientColors = [primary, '#0891B2', accent, '#F97316', secondary];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support Acknowledgement</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #1F2937; background-color: #F3F4F6;">
  <div style="max-width: 672px; margin: 40px auto; background: #FFFFFF; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #E5E7EB;">
    
    <!-- Logo section -->
    <div style="background: #FFFFFF; padding: 32px; text-align: center; border-bottom: 1px solid #F3F4F6;">
      ${logoUrl ? `<img alt="EdTec Online" src="${logoUrl}" width="80" height="80" style="height: 80px; width: auto; max-width: 200px; display: block; margin: 0 auto; border: 0;">` : '<div style="font-size: 24px; font-weight: 700; color: #1E549F;">EdTec Online</div>'}
    </div>

    <!-- Hero section -->
    <div style="text-align: center; padding: 40px 40px 24px;">
      <div style="display: inline-block; width: 64px; height: 64px; border-radius: 50%; background: #EFF6FF; margin-bottom: 24px; line-height: 64px; font-size: 28px;">✉️</div>
      <h1 style="font-size: 28px; font-weight: 700; color: #111827; margin: 0 0 12px;">We've Received Your Message</h1>
      <p style="font-size: 18px; color: #6B7280; margin: 0 auto; max-width: 480px;">Thank you for reaching out to our support team. We wanted to let you know that we've received your request and are already looking into it.</p>
    </div>

    <!-- Ticket reference card -->
    <div style="margin: 0 32px 32px; background: #F9FAFB; border-radius: 8px; padding: 0; border: 1px solid #E5E7EB; overflow: hidden; text-align: center;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-radius: 8px 8px 0 0; overflow: hidden;">
        <tr>
          ${gradientColors.map((color) => `<td style="height: 4px; background-color: ${color}; padding: 0; line-height: 0; font-size: 0;" width="20%">&nbsp;</td>`).join('')}
        </tr>
      </table>
      <div style="padding: 32px;">
        <h2 style="font-size: 11px; font-weight: 700; color: #6B7280; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.1em;">Your Ticket Reference</h2>
        <div style="display: inline-block; background: #FFFFFF; border: 1px solid #D1D5DB; border-radius: 6px; padding: 12px 32px; margin-bottom: 24px;">
          <span style="font-family: monospace; font-size: 24px; font-weight: 700; color: #111827; letter-spacing: 2px;">${ticketReference}</span>
        </div>
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center">
              <p style="font-size: 14px; color: #6B7280; margin: 0;">⏱️ Estimated response time: <strong style="color: #111827;">Within 24 hours</strong></p>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Color bar -->
    <div style="height: 4px; margin: 0 32px 32px; border-radius: 4px; overflow: hidden;">
      <div style="width: 25%; height: 4px; background: ${primary}; display: inline-block;"></div>
      <div style="width: 25%; height: 4px; background: ${secondary}; display: inline-block;"></div>
      <div style="width: 25%; height: 4px; background: ${accent}; display: inline-block;"></div>
      <div style="width: 25%; height: 4px; background: ${success}; display: inline-block;"></div>
    </div>

    <!-- Self-service resources -->
    <div style="padding: 0 32px 32px; text-align: center;">
      <h3 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 8px;">Need an answer right away?</h3>
      <p style="font-size: 14px; color: #6B7280; margin: 0 0 32px;">While you wait, you might find what you're looking for in our self-service resources.</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 480px; margin: 0 auto;">
        <tr>
          <td width="50%" style="padding: 0 8px 8px 0; vertical-align: top;">
            <a href="${supportUrl}" style="display: block; padding: 16px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; text-decoration: none; color: inherit; text-align: left;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="48" style="vertical-align: top; padding-right: 16px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: #EFF6FF; line-height: 40px; text-align: center; font-size: 20px;">❓</div>
                  </td>
                  <td>
                    <div style="font-weight: 700; color: #111827; font-size: 14px;">Help Center</div>
                    <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">Browse guides &amp; tutorials</div>
                  </td>
                </tr>
              </table>
            </a>
          </td>
          <td width="50%" style="padding: 0 0 8px 8px; vertical-align: top;">
            <a href="${supportUrl}#faq" style="display: block; padding: 16px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; text-decoration: none; color: inherit; text-align: left;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="48" style="vertical-align: top; padding-right: 16px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: #EFF6FF; line-height: 40px; text-align: center; font-size: 20px;">📋</div>
                  </td>
                  <td>
                    <div style="font-weight: 700; color: #111827; font-size: 14px;">FAQs</div>
                    <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">Common questions solved</div>
                  </td>
                </tr>
              </table>
            </a>
          </td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div style="background: #F9FAFB; padding: 32px; text-align: center; border-top: 1px solid #E5E7EB;">
      <p style="font-size: 14px; color: #6B7280; margin: 0 0 8px;">Need more help? Contact our <a href="${supportUrl}" style="color: ${primary}; text-decoration: underline;">Support Team</a></p>
      <p style="font-size: 12px; color: #9CA3AF; margin: 0;">© ${new Date().getFullYear()} EdTec Online. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`.trim();
}
