import type { CrmLead } from "@/lib/crm/types"

export const LEAD_WELCOME_WEBSITE = "https://edtec.online"
export const LEAD_WELCOME_CONTACT = "hello@edtec.online"

export type LeadWelcomeVars = {
  student_name: string
  course_name: string
  edtec_website: string
  edtec_contact: string
  logo_url: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

export function leadWelcomeSubject(courseName: string): string {
  return `We received your enquiry for ${courseName}`
}

export function resolveLeadWelcomePreviewVars(
  lead: Pick<CrmLead, "full_name" | "course">,
  logoOrigin = "https://sms.edtec.online"
): LeadWelcomeVars {
  const origin = logoOrigin.replace(/\/$/, "")
  return {
    student_name: lead.full_name?.trim() || "there",
    course_name: lead.course?.trim() || "our programs",
    edtec_website: LEAD_WELCOME_WEBSITE,
    edtec_contact: LEAD_WELCOME_CONTACT,
    logo_url: `${origin}/images/etia-logo.png`,
  }
}

export function buildLeadWelcomeEmailHtml(vars: LeadWelcomeVars): string {
  const name = escapeHtml(vars.student_name)
  const course = escapeHtml(vars.course_name)
  const website = escapeHtml(vars.edtec_website)
  const contact = escapeHtml(vars.edtec_contact)
  const logo = escapeHtml(vars.logo_url)

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>We received your enquiry</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:#2563EB;padding:28px 32px;text-align:center;">
              <img src="${logo}" alt="EdTec Online" width="72" height="72" style="display:block;margin:0 auto 12px auto;border:0;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;">EdTec Online</h1>
              <p style="margin:8px 0 0 0;color:#dbeafe;font-size:14px;">Learn. Prepare. Succeed.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px 0;font-size:16px;">Dear ${name},</p>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">
                Thank you for showing interest in <strong>${course}</strong> with EdTec Online.
              </p>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;">
                We have received your enquiry successfully, and our team will reach out to you shortly to help you with the course details, enrolment process, fees, and any questions you may have.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border-left:4px solid #2563EB;border-radius:8px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 8px 0;font-weight:bold;color:#1e40af;">Your Interest</p>
                    <p style="margin:0 0 6px 0;font-size:14px;">Course: <strong>${course}</strong></p>
                    <p style="margin:0;font-size:14px;">EdTec Online: Your learning partner for professional and exam preparation programs</p>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0 0;font-size:15px;line-height:1.6;">
                We look forward to assisting you and helping you take the next step toward your learning goals.
              </p>
              <p style="margin:24px 0 0 0;font-size:15px;">
                Warm regards,<br>
                <strong>EdTec Online Team</strong><br>
                Learn. Prepare. Succeed.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px 32px;text-align:center;border-top:1px solid #e2e8f0;background:#f8fafc;">
              <img src="${logo}" alt="EdTec Online Logo" width="48" height="48" style="display:block;margin:0 auto 10px auto;border:0;">
              <p style="margin:0;font-size:13px;">
                <a href="${website}" style="color:#2563EB;text-decoration:none;">${website}</a>
              </p>
              <p style="margin:6px 0 0 0;font-size:13px;color:#475569;">${contact}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildLeadWelcomeWhatsAppBody(vars: LeadWelcomeVars): string {
  return [
    "🎓 EdTec Online",
    "",
    `Hi ${vars.student_name} 👋`,
    "",
    `Thank you for showing interest in ${vars.course_name} with EdTec Online.`,
    "",
    "✅ We’ve received your enquiry successfully.",
    "",
    "Our team will reach out to you shortly to provide you with more information about the course, fees, enrolment process, and answer any questions you may have.",
    "",
    "We look forward to helping you get started! 🚀",
    "",
    "EdTec Online",
    "Learn. Prepare. Succeed.",
  ].join("\n")
}

export function buildLeadWelcomeEmailText(vars: LeadWelcomeVars): string {
  return `Dear ${vars.student_name},

Thank you for showing interest in ${vars.course_name} with EdTec Online.

We have received your enquiry successfully, and our team will reach out to you shortly to help you with the course details, enrolment process, fees, and any questions you may have.

Your Interest
* Course: ${vars.course_name}
* EdTec Online: Your learning partner for professional and exam preparation programs

We look forward to assisting you and helping you take the next step toward your learning goals.

Warm regards,
EdTec Online Team
Learn. Prepare. Succeed.

${vars.edtec_website}
${vars.edtec_contact}`
}
