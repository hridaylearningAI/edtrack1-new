import { NextRequest, NextResponse } from "next/server"
import { requireAuth, verifyAuthToken } from "@/lib/api/auth"
import { getSupabaseClient, formatResponse } from "@/lib/api/supabase"
import { corsHeaders } from "@/lib/api/utils"
import { generateCertificatePDF, generateCertificateNumber, generateCertificateEmailHTML, CertificateData } from "@/lib/services/certificateService"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

/** GET /api/progress/trial/sections?enrollmentId=X - completed section IDs for trial */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(formatResponse(false, null, "Unauthorized"), {
        status: 401,
        headers: corsHeaders,
      })
    }
    const { searchParams } = new URL(request.url)
    const enrollmentIdParam = searchParams.get("enrollmentId")
    if (!enrollmentIdParam) {
      return NextResponse.json(
        formatResponse(false, null, "Missing enrollmentId"),
        { status: 400, headers: corsHeaders }
      )
    }
    const enrollmentId = parseInt(enrollmentIdParam, 10)
    if (Number.isNaN(enrollmentId)) {
      return NextResponse.json(
        formatResponse(false, null, "Invalid enrollmentId"),
        { status: 400, headers: corsHeaders }
      )
    }
    const supabase = getSupabaseClient()
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id, student_id, course_id, trial_last_page_id, trial_last_position")
      .eq("id", enrollmentId)
      .eq("student_id", authResult.user.id)
      .maybeSingle()
    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        formatResponse(false, null, "Enrollment not found or access denied"),
        { status: 404, headers: corsHeaders }
      )
    }
    const { data: rows, error } = await supabase
      .from("course_trial_progress")
      .select("section_id")
      .eq("enrollment_id", enrollmentId)
      .order("completed_at", { ascending: true })
    if (error) throw error
    const completedSectionIds = (rows ?? []).map((r) => r.section_id)
    const enc = enrollment as { trial_last_page_id?: string | null; trial_last_position?: number | null }
    const lastPageId = enc.trial_last_page_id ?? null
    const lastPosition = enc.trial_last_position != null ? enc.trial_last_position : null
    return NextResponse.json(
      formatResponse(true, {
        enrollmentId,
        courseId: enrollment.course_id,
        completedSectionIds,
        totalCompleted: completedSectionIds.length,
        lastPageId,
        lastPosition,
      }),
      { headers: corsHeaders }
    )
  } catch (err: unknown) {
    console.error("Error getting trial progress:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to get progress"),
      { status: 500, headers: corsHeaders }
    )
  }
}

/** POST /api/progress/trial/sections - body: { enrollmentId, courseId, completedSectionIds?, totalSections?, lastPageId?, token? (for sendBeacon) } */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>
    const tokenFromBody = typeof body.token === "string" ? body.token : undefined
    if (tokenFromBody !== undefined) delete body.token
    const authResult = tokenFromBody !== undefined
      ? await verifyAuthToken(tokenFromBody)
      : await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(formatResponse(false, null, "Unauthorized"), {
        status: 401,
        headers: corsHeaders,
      })
    }
    const { enrollmentId, courseId, completedSectionIds, totalSections, completedRequiredCount, lastPageId, lastPosition } = body as {
      enrollmentId?: number
      courseId?: number
      completedSectionIds?: string[]
      totalSections?: number
      completedRequiredCount?: number
      lastPageId?: string | null
      lastPosition?: number | null
    }
    if (enrollmentId == null || courseId == null) {
      return NextResponse.json(
        formatResponse(false, null, "Missing enrollmentId or courseId"),
        { status: 400, headers: corsHeaders }
      )
    }
    const supabase = getSupabaseClient()
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id, student_id, course_id, status, with_certificate")
      .eq("id", enrollmentId)
      .eq("student_id", authResult.user.id)
      .eq("course_id", courseId)
      .maybeSingle()
    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        formatResponse(false, null, "Enrollment not found or access denied"),
        { status: 404, headers: corsHeaders }
      )
    }

    const now = new Date().toISOString()
    if (Array.isArray(completedSectionIds) && completedSectionIds.length > 0) {
      const rows = completedSectionIds.map((section_id: string) => ({
        enrollment_id: enrollmentId,
        course_id: courseId,
        section_id,
        completed_at: now,
        updated_at: now,
      }))
      const { error: upsertError } = await supabase
        .from("course_trial_progress")
        .upsert(rows, { onConflict: "enrollment_id,section_id", ignoreDuplicates: false })
      if (upsertError) throw upsertError
    }

    const completedForProgress =
      typeof completedRequiredCount === "number"
        ? completedRequiredCount
        : Array.isArray(completedSectionIds)
          ? completedSectionIds.length
          : undefined
    const progressPercent =
      typeof totalSections === "number" && totalSections > 0 && completedForProgress !== undefined
        ? Math.min(100, Math.round((completedForProgress / totalSections) * 100))
        : null

    const enrollmentUpdate: Record<string, unknown> = { updated_at: now }
    if (progressPercent != null) {
      enrollmentUpdate.progress = progressPercent
      if (progressPercent >= 100) {
        enrollmentUpdate.status = "completed"
        enrollmentUpdate.completion_date = now.split("T")[0]
        // Set grade from quiz attempts (average of latest attempt per quiz)
        const { data: quizRows } = await supabase
          .from("course_quiz_attempts")
          .select("quiz_identifier, score_percent, attempted_at")
          .eq("enrollment_id", enrollmentId)
          .eq("course_id", courseId)
          .order("attempted_at", { ascending: false })
        const latestByQuiz = new Map<string, number>()
        for (const row of quizRows ?? []) {
          if (!latestByQuiz.has(row.quiz_identifier)) {
            latestByQuiz.set(row.quiz_identifier, row.score_percent)
          }
        }
        if (latestByQuiz.size > 0) {
          const sum = [...latestByQuiz.values()].reduce((a, b) => a + b, 0)
          enrollmentUpdate.grade = `${Math.round(sum / latestByQuiz.size)}%`
        }
      }
    }
    if (lastPageId !== undefined && lastPageId !== null) {
      enrollmentUpdate.trial_last_page_id = String(lastPageId).trim() || null
    }
    if (lastPosition !== undefined && lastPosition !== null && Number.isInteger(lastPosition) && lastPosition >= 0) {
      enrollmentUpdate.trial_last_position = lastPosition
    } else if (lastPosition === null) {
      enrollmentUpdate.trial_last_position = null
    }
    if (Object.keys(enrollmentUpdate).length > 1) {
      await supabase
        .from("enrollments")
        .update(enrollmentUpdate)
        .eq("id", enrollmentId)
    }

    // When course is completed (100%) and enrollment includes certificate, generate certificate if missing
    const withCert = (enrollment as { with_certificate?: boolean }).with_certificate === true
    if (progressPercent === 100 && withCert) {
      const { data: fullEnrollment } = await supabase
        .from("enrollments")
        .select(
          `
          id, student_id, course_id, completion_date, grade, updated_at,
          courses ( id, name ),
          users ( id, name, email )
        `
        )
        .eq("id", enrollmentId)
        .single()
      const { data: existingCert } = await supabase
        .from("certificates")
        .select("id")
        .eq("enrollment_id", enrollmentId)
        .maybeSingle()
      if (fullEnrollment && !existingCert) {
        try {
          const completionDate =
            (fullEnrollment.completion_date as string) ||
            (fullEnrollment.updated_at as string)?.split("T")[0] ||
            now.split("T")[0]
          const certificateNumber = generateCertificateNumber(enrollmentId)
          const certificateData: CertificateData = {
            studentName: (fullEnrollment.users as { name?: string })?.name || "Student",
            courseName: (fullEnrollment.courses as { name?: string })?.name || "Course",
            completionDate,
            certificateNumber,
            grade: (fullEnrollment.grade as string) || undefined,
          }
          const certificateUrl = `/api/certificates/view/${enrollmentId}`
          const { data: certificate, error: certError } = await supabase
            .from("certificates")
            .insert({
              enrollment_id: enrollmentId,
              student_id: fullEnrollment.student_id,
              course_id: fullEnrollment.course_id,
              certificate_number: certificateNumber,
              certificate_url: certificateUrl,
              certificate_pdf_url: certificateUrl,
              issued_date: completionDate,
            })
            .select()
            .single()
          if (certError) {
            console.error("Trial progress: certificate insert error", certError)
          } else if (certificate && process.env.RESEND_API_KEY) {
            const studentEmail = (fullEnrollment.users as { email?: string })?.email
            if (studentEmail) {
              try {
                const pdfBuffer = await generateCertificatePDF(certificateData)
                const emailHtml = generateCertificateEmailHTML(certificateData, certificateUrl)
                await resend.emails.send({
                  from: process.env.FROM_EMAIL || "noreply@edtec.online",
                  to: studentEmail,
                  subject: `🎓 Your Certificate for ${certificateData.courseName}`,
                  html: emailHtml,
                  attachments: [
                    { filename: `certificate-${certificateNumber}.pdf`, content: pdfBuffer },
                  ],
                })
                await supabase
                  .from("certificates")
                  .update({
                    email_sent: true,
                    email_sent_at: new Date().toISOString(),
                  })
                  .eq("id", certificate.id)
              } catch (emailErr) {
                console.error("Trial progress: certificate email error", emailErr)
              }
            }
          }
        } catch (certErr) {
          console.error("Trial progress: certificate generation error", certErr)
        }
      }
    }

    return NextResponse.json(
      formatResponse(true, { completedSectionIds, enrollmentId, courseId }, "Progress saved"),
      { headers: corsHeaders }
    )
  } catch (err: unknown) {
    console.error("Error saving trial progress:", err)
    return NextResponse.json(
      formatResponse(false, null, err instanceof Error ? err.message : "Failed to save progress"),
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}
