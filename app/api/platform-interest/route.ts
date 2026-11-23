import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { corsHeaders } from '@/lib/api/utils'
import { getSupabaseClient } from '@/lib/api/supabase'
import {
  buildDidacPlatformInterestEmail,
  DIDAC_BROCHURE_FILENAME,
  DIDAC_BROCHURE_PATH,
  getEdtrackSiteBaseUrl,
} from '@/lib/email/didac-interest'

const resend = new Resend(process.env.RESEND_API_KEY)

type InterestBody = {
  name?: string
  organisation?: string
  organization?: string
  email?: string
  phone?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function loadBrochureAttachment(baseUrl: string) {
  try {
    const pdfPath = join(process.cwd(), 'public', DIDAC_BROCHURE_PATH.replace(/^\//, ''))
    const content = await readFile(pdfPath)
    return [
      {
        filename: DIDAC_BROCHURE_FILENAME,
        content,
      },
    ]
  } catch {
    // On Vercel, public assets are not always present under /var/task/public.
    try {
      const origin = baseUrl.replace(/\/$/, '')
      const url = `${origin}${DIDAC_BROCHURE_PATH}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Brochure fetch failed (${response.status}): ${url}`)
      }
      const content = Buffer.from(await response.arrayBuffer())
      return [
        {
          filename: DIDAC_BROCHURE_FILENAME,
          content,
        },
      ]
    } catch (error) {
      console.warn('EdTrack brochure attachment skipped:', error)
      return undefined
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as InterestBody
    const name = String(body.name ?? '').trim()
    const organisation = String(body.organisation ?? body.organization ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const phone = String(body.phone ?? '').trim()

    if (!name || !organisation || !email || !phone) {
      return NextResponse.json(
        { error: 'Name, organisation, email, and phone number are required.' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!/^[+]?[\d\s().-]{7,20}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Please enter a valid phone number.' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()
    const { data: existing } = await supabase
      .from('platform_interests')
      .select('id')
      .ilike('email', email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        {
          success: true,
          alreadySubmitted: true,
          message: 'You have already shown interest. Our team will be in touch soon.',
        },
        { status: 200, headers: corsHeaders }
      )
    }

    const { error: insertError } = await supabase.from('platform_interests').insert({
      name,
      organisation,
      email,
      phone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('platform_interests insert failed:', insertError)
    }

    const safeName = escapeHtml(name)
    const safeOrg = escapeHtml(organisation)
    const safeEmail = escapeHtml(email)
    const safePhone = escapeHtml(phone)

    if (process.env.RESEND_API_KEY) {
      const from = process.env.FROM_EMAIL || 'noreply@edtec.online'
      const adminTo = process.env.PLATFORM_INTEREST_EMAIL || 'hello@edtec.online'
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : getEdtrackSiteBaseUrl())
      const thankYouHtml = buildDidacPlatformInterestEmail(name, baseUrl)
      const brochureAttachments = await loadBrochureAttachment(baseUrl)

      const adminHtml = `
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#263432;max-width:560px;margin:0 auto;padding:24px;">
          <h1 style="font-size:22px;letter-spacing:-0.03em;">New EdTrack ONE interest</h1>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;font-weight:700;">Name</td><td>${safeName}</td></tr>
            <tr><td style="padding:8px 0;font-weight:700;">Organisation</td><td>${safeOrg}</td></tr>
            <tr><td style="padding:8px 0;font-weight:700;">Email</td><td><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
            <tr><td style="padding:8px 0;font-weight:700;">Phone</td><td><a href="tel:${safePhone}">${safePhone}</a></td></tr>
          </table>
        </div>
      `

      await Promise.allSettled([
        resend.emails.send({
          from,
          to: email,
          subject: 'Thank you for your interest in EdTrack 1 at DIDAC',
          html: thankYouHtml,
          ...(brochureAttachments ? { attachments: brochureAttachments } : {}),
        }),
        resend.emails.send({
          from,
          to: adminTo,
          subject: `EdTrack ONE interest: ${name} · ${organisation}`,
          html: adminHtml,
        }),
      ])
    } else if (insertError) {
      return NextResponse.json(
        { error: 'Unable to save your interest right now. Please try again shortly.' },
        { status: 503, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Thank you for your interest. We will be in touch soon.',
      },
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error('platform-interest error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}
