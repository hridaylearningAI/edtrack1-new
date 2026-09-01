import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { corsHeaders } from '@/lib/api/utils'
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { courseId, courseName, name, email, mobile, region, userId } = await request.json()

    // Validate required fields
    if (!courseId || !courseName || !name || !email || !mobile || !region) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Check if interest already exists
    const supabase = getSupabaseClient()
    const { data: existingInterest, error: checkError } = await supabase
      .from('course_interests')
      .select('id, created_at')
      .eq('course_id', courseId)
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing interest:', checkError)
      // Continue anyway - don't block submission if check fails
    }

    // If interest already exists, return early without sending emails again
    if (existingInterest) {
      return NextResponse.json(
        {
          success: true,
          message: 'You have already shown interest in this course. We will contact you soon!',
          alreadySubmitted: true,
        },
        { 
          status: 200,
          headers: corsHeaders,
        }
      )
    }

    // Try to find database user ID by email (user_id is optional, email is primary identifier)
    let databaseUserId: number | null = null
    if (email) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle()
      
      if (dbUser) {
        databaseUserId = dbUser.id
      }
    }

    // Store interest in database
    const { data: interest, error: insertError } = await supabase
      .from('course_interests')
      .insert({
        course_id: courseId,
        email: email.toLowerCase().trim(),
        name: name.trim(),
        mobile: mobile.trim(),
        region: region.trim(),
        user_id: databaseUserId, // Use database user ID, or null if not found
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error storing interest:', insertError)
      // Continue with email sending even if database insert fails
      // This ensures emails are sent even if there's a database issue
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Resend API key not configured' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Thank you email to user
    const thankYouEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank You for Your Interest</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">EdTec Online</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Thank You for Your Interest</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${name},</h2>
          
          <p>Thank you for expressing interest in <strong>${courseName}</strong>!</p>
          
          <p>We have received your information and our team will review your interest. We'll get back to you soon with more details about the course and how you can get started.</p>
          
          <div style="background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0;"><strong>What's Next?</strong></p>
            <p style="margin: 5px 0 0 0;">Our team will contact you at <strong>${email}</strong> or <strong>${mobile}</strong> within the next few business days.</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated email from EdTec Online.<br>
            If you have any questions, please contact us at hello@edtec.online
          </p>
        </div>
      </body>
      </html>
    `

    // Customer details email to admin
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Course Interest - ${courseName}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">EdTec Online</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">New Course Interest</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">New Interest in Course</h2>
          
          <p>A user has expressed interest in a course. Here are the details:</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 150px;">Course:</td>
                <td style="padding: 8px 0;">${courseName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Course ID:</td>
                <td style="padding: 8px 0;">${courseId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Name:</td>
                <td style="padding: 8px 0;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Email:</td>
                <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #2196F3;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Mobile:</td>
                <td style="padding: 8px 0;"><a href="tel:${mobile}" style="color: #2196F3;">${mobile}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Region:</td>
                <td style="padding: 8px 0;">${region}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0;"><strong>Action Required:</strong></p>
            <p style="margin: 5px 0 0 0;">Please contact the user at your earliest convenience to provide more information about the course.</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated notification from EdTec Online Student Management System.
          </p>
        </div>
      </body>
      </html>
    `

    // Send both emails
    const [thankYouResult, adminResult] = await Promise.allSettled([
      resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@edtec.online',
        to: email,
        subject: `Thank You for Your Interest in ${courseName}`,
        html: thankYouEmailHtml,
      }),
      resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@edtec.online',
        to: 'hello@edtec.online',
        subject: `New Course Interest: ${courseName} - ${name}`,
        html: adminEmailHtml,
      }),
    ])

    // Check if emails were sent successfully
    if (thankYouResult.status === 'rejected') {
      console.error('Failed to send thank you email:', thankYouResult.reason)
    }

    if (adminResult.status === 'rejected') {
      console.error('Failed to send admin email:', adminResult.reason)
    }

    // Return success even if one email fails (we still want to acknowledge the submission)
    return NextResponse.json(
      {
        success: true,
        message: 'Interest submitted successfully. Thank you!',
      },
      { 
        status: 200,
        headers: corsHeaders,
      }
    )
  } catch (error) {
    console.error('Course interest submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: corsHeaders,
      }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const email = searchParams.get('email')

    if (!courseId || !email) {
      return NextResponse.json(
        { error: 'courseId and email are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()
    const { data: interest, error } = await supabase
      .from('course_interests')
      .select('id, created_at, unlocked_at')
      .eq('course_id', parseInt(courseId))
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking interest:', error)
      return NextResponse.json(
        { error: 'Failed to check interest status' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      {
        success: true,
        hasShownInterest: !!interest,
        submittedAt: interest?.created_at || null,
        unlocked: !!(interest && interest.unlocked_at != null),
        unlockedAt: interest?.unlocked_at || null,
      },
      { 
        status: 200,
        headers: corsHeaders,
      }
    )
  } catch (error) {
    console.error('Error checking interest status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: corsHeaders,
      }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

