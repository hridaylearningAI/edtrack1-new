import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { corsHeaders } from '@/lib/api/utils'
import { getSupabaseClient } from '@/lib/api/supabase'
import {requireAuth, isAdminRole } from '@/lib/api/auth'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * PUT /api/course-eligibility/[id]
 * Update eligibility status and notes (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Only admins can update eligibility
    if (!isAdminRole(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Access denied. Admin only.' },
        { status: 403, headers: corsHeaders }
      )
    }

    const { id } = await params
    const { eligibilityStatus, notes } = await request.json()

    // Validate eligibility status
    const validStatuses = ['pending', 'eligible', 'not_eligible', 'needs_review', 'under_review']
    if (eligibilityStatus && !validStatuses.includes(eligibilityStatus)) {
      return NextResponse.json(
        { error: 'Invalid eligibility status' },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = getSupabaseClient()

    // Get current eligibility record
    const { data: currentEligibility, error: fetchError } = await supabase
      .from('course_eligibility')
      .select('*, courses(id, name)')
      .eq('id', parseInt(id))
      .single()

    if (fetchError || !currentEligibility) {
      return NextResponse.json(
        { error: 'Eligibility record not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (eligibilityStatus) {
      updateData.eligibility_status = eligibilityStatus
      updateData.checked_by = authResult.user.id
      updateData.checked_at = new Date().toISOString()
    }

    if (notes !== undefined) {
      updateData.notes = notes || null
    }

    // Update eligibility record
    const { data: updatedEligibility, error: updateError } = await supabase
      .from('course_eligibility')
      .update(updateData)
      .eq('id', parseInt(id))
      .select('*, courses(id, name)')
      .single()

    if (updateError) {
      console.error('Error updating eligibility:', updateError)
      return NextResponse.json(
        { error: 'Failed to update eligibility' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Send email notification if status changed
    if (eligibilityStatus && eligibilityStatus !== currentEligibility.eligibility_status) {
      try {
        const courseName = (updatedEligibility.courses as any)?.name || 'the course'
        
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Eligibility Status Updated</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">EdTec Online</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Eligibility Status Updated</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Hello ${currentEligibility.name},</h2>
              
              <p>Your eligibility status for <strong>${courseName}</strong> has been updated.</p>
              
              ${eligibilityStatus === 'eligible' 
                ? '<div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px; color: #155724;"><p style="margin: 0;"><strong>✓ Congratulations!</strong> You are now eligible for this course. You can now show interest in the course.</p></div>'
                : eligibilityStatus === 'not_eligible'
                ? '<div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 4px; color: #721c24;"><p style="margin: 0;"><strong>Eligibility Status:</strong> Based on our review, you are not eligible for this course at this time. Our team will contact you with more details and guidance.</p></div>'
                : '<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; color: #856404;"><p style="margin: 0;"><strong>Eligibility Status:</strong> Your eligibility is currently under review. We will contact you soon with the results.</p></div>'
              }
              
              ${notes ? `
              <div style="background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0;"><strong>Admin Notes:</strong></p>
                <p style="margin: 5px 0 0 0;">${notes}</p>
              </div>
              ` : ''}
              
              <div style="background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0;"><strong>What's Next?</strong></p>
                <p style="margin: 5px 0 0 0;">${eligibilityStatus === 'eligible' ? 'You can now visit the course page and show your interest.' : 'Our team will contact you at <strong>' + currentEligibility.email + '</strong> or <strong>' + currentEligibility.mobile + '</strong> within the next few business days.'}</p>
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

        await resend.emails.send({
          from: process.env.FROM_EMAIL || 'noreply@edtec.online',
          to: currentEligibility.email,
          subject: `Eligibility Status Updated for ${courseName}`,
          html: emailHtml,
        })
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedEligibility,
        message: 'Eligibility updated successfully',
      },
      { 
        status: 200,
        headers: corsHeaders,
      }
    )
  } catch (error) {
    console.error('Error in PUT /api/course-eligibility/[id]:', error)
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
