import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { corsHeaders } from '@/lib/api/utils'
import { getSupabaseClient, formatResponse } from '@/lib/api/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { 
      courseId, 
      courseName, 
      name, 
      email, 
      mobile, 
      region, 
      hasBachelorsDegree,
      isRegisteredNurseHomeCountry,
      completedClinicalTrainingHours,
      qualificationInEnglish,
      completedOrWillingEnglishTest,
      hasClinicalExperience,
      currentlyPractisingNurse,
      preparedStructuredPlan,
      hasValidPassport,
      canCommitStudyTime,
      additionalInfo,
      eligibilityStatus, // Automatically determined by frontend
      userId 
    } = await request.json()

    // Validate required fields
    if (!courseId || !courseName || !name || !email || !mobile || !region) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate all workflow questions are answered
    if (
      !hasBachelorsDegree ||
      !isRegisteredNurseHomeCountry ||
      !completedClinicalTrainingHours ||
      !qualificationInEnglish ||
      !completedOrWillingEnglishTest ||
      !hasClinicalExperience ||
      !currentlyPractisingNurse ||
      !preparedStructuredPlan ||
      !hasValidPassport ||
      !canCommitStudyTime
    ) {
      return NextResponse.json(
        { error: 'All eligibility questions must be answered' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Verify eligibility status matches the logic (security check)
    // Helper function to convert 'yes'/'no' strings or booleans to boolean
    const isYes = (value: any): boolean => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value.toLowerCase() === 'yes';
      return false;
    };

    const hasBachelorsDegreeBool = isYes(hasBachelorsDegree);
    const isRegisteredNurseHomeCountryBool = isYes(isRegisteredNurseHomeCountry);
    const completedClinicalTrainingHoursBool = isYes(completedClinicalTrainingHours);
    const qualificationInEnglishBool = isYes(qualificationInEnglish);
    const completedOrWillingEnglishTestBool = isYes(completedOrWillingEnglishTest);
    const hasClinicalExperienceBool = isYes(hasClinicalExperience);
    const currentlyPractisingNurseBool = isYes(currentlyPractisingNurse);
    const preparedStructuredPlanBool = isYes(preparedStructuredPlan);
    const hasValidPassportBool = isYes(hasValidPassport);
    const canCommitStudyTimeBool = isYes(canCommitStudyTime);

    let calculatedStatus: 'eligible' | 'not_eligible' | 'needs_review' = 'needs_review';
    
    // Requires Further Assessment:
    // Missing foundational requirements: degree or registration.
    if (
      !hasBachelorsDegreeBool ||
      !isRegisteredNurseHomeCountryBool
    ) {
      calculatedStatus = 'not_eligible';
    }
    else {
      const yesCount = [
        hasBachelorsDegreeBool,
        isRegisteredNurseHomeCountryBool,
        completedClinicalTrainingHoursBool,
        qualificationInEnglishBool,
        completedOrWillingEnglishTestBool,
        hasClinicalExperienceBool,
        currentlyPractisingNurseBool,
        canCommitStudyTimeBool,
        preparedStructuredPlanBool,
        hasValidPassportBool,
      ].filter(Boolean).length

      // Eligible with Conditions:
      // English readiness not complete, limited recent experience,
      // or clinical training needs clarification.
      if (
        !completedOrWillingEnglishTestBool ||
        !hasClinicalExperienceBool ||
        !currentlyPractisingNurseBool ||
        !completedClinicalTrainingHoursBool ||
        yesCount < 5
      ) {
        calculatedStatus = 'needs_review'
      } else {
        calculatedStatus = 'eligible'
      }
    }

    // Keep this verification branch explicit to avoid silent drift.
    if (
      hasBachelorsDegreeBool &&
      isRegisteredNurseHomeCountryBool &&
      completedClinicalTrainingHoursBool &&
      qualificationInEnglishBool &&
      completedOrWillingEnglishTestBool &&
      hasClinicalExperienceBool &&
      currentlyPractisingNurseBool &&
      preparedStructuredPlanBool &&
      hasValidPassportBool &&
      canCommitStudyTimeBool
    ) {
      calculatedStatus = 'eligible'
    }

    // Use calculated status (server-side verification)
    const finalEligibilityStatus = calculatedStatus;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Check if eligibility check already exists
    const supabase = getSupabaseClient()
    const { data: existingEligibility, error: checkError } = await supabase
      .from('course_eligibility')
      .select('id, eligibility_status, created_at')
      .eq('course_id', courseId)
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing eligibility:', checkError)
      // Continue anyway - don't block submission if check fails
    }

    // If eligibility check already exists, return early without sending emails again
    if (existingEligibility) {
      return NextResponse.json(
        {
          success: true,
          message: 'You have already checked your eligibility for this course. We will review and contact you soon!',
          alreadySubmitted: true,
          eligibilityStatus: existingEligibility.eligibility_status || 'pending',
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

    // Prepare eligibility data as JSONB with all workflow answers
    const eligibilityData = {
      hasBachelorsDegree,
      isRegisteredNurseHomeCountry,
      completedClinicalTrainingHours,
      qualificationInEnglish,
      completedOrWillingEnglishTest,
      hasClinicalExperience,
      currentlyPractisingNurse,
      preparedStructuredPlan,
      hasValidPassport,
      canCommitStudyTime,
      additionalInfo: additionalInfo?.trim() || null,
    }

    // Store eligibility check in database
    const { data: eligibility, error: insertError } = await supabase
      .from('course_eligibility')
      .insert({
        course_id: courseId,
        email: email.toLowerCase().trim(),
        name: name.trim(),
        mobile: mobile.trim(),
        region: region.trim(),
        user_id: databaseUserId, // Use database user ID, or null if not found
        eligibility_status: finalEligibilityStatus, // Automatically determined status
        eligibility_data: eligibilityData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error storing eligibility check:', insertError)
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
        <title>Eligibility Check Submitted</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">EdTec Online</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Eligibility Check Submitted</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${name},</h2>
          
          <p>Thank you for checking your eligibility for <strong>${courseName}</strong>!</p>
          
          ${finalEligibilityStatus === 'eligible' 
            ? '<p style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px; color: #155724;"><strong>Likely Eligible to Proceed:</strong> You appear eligible based on preliminary information. Final eligibility is determined by the relevant regulatory authority.</p>'
            : finalEligibilityStatus === 'not_eligible'
            ? '<p style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 4px; color: #721c24;"><strong>Requires Further Assessment:</strong> Your pathway requires further clarification before proceeding.</p>'
            : '<p style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; color: #664d03;"><strong>Eligible with Conditions:</strong> You may require additional steps before proceeding.</p>'
          }
          
          <div style="background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0;"><strong>What's Next?</strong></p>
            <p style="margin: 5px 0 0 0;">Our team will ${finalEligibilityStatus === 'eligible' ? 'contact you' : 'review your information and contact you'} at <strong>${email}</strong> or <strong>${mobile}</strong> within the next few business days.</p>
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

    // Admin notification email
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Eligibility Check - ${courseName}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">EdTec Online</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">New Eligibility Check</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">New Eligibility Check for Course</h2>
          
          <p>A user has submitted an eligibility check for a course. Here are the details:</p>
          
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
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Eligibility Status:</td>
                <td style="padding: 8px 0;">
                  <strong style="color: ${
                    finalEligibilityStatus === 'eligible' ? '#28a745' :
                    finalEligibilityStatus === 'not_eligible' ? '#dc3545' :
                    '#ffc107'
                  };">
                    ${finalEligibilityStatus === 'eligible' ? 'LIKELY ELIGIBLE TO PROCEED' :
                      finalEligibilityStatus === 'not_eligible' ? 'REQUIRES FURTHER ASSESSMENT' :
                      'ELIGIBLE WITH CONDITIONS'}
                  </strong>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 15px 0 8px 0; font-weight: bold; border-top: 1px solid #ddd;">Workflow Answers:</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Bachelor's Degree in Nursing:</td>
                <td style="padding: 8px 0;">${hasBachelorsDegree === 'yes' ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Registered nurse in home country:</td>
                <td style="padding: 8px 0;">${isRegisteredNurseHomeCountry === 'yes' ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Completed clinical training hours:</td>
                <td style="padding: 8px 0;">${completedClinicalTrainingHours === 'yes' ? 'Yes' : completedClinicalTrainingHours === 'unsure' ? 'Unsure' : 'No'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Qualification taught in English:</td>
                <td style="padding: 8px 0;">${qualificationInEnglish === 'yes' ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Completed/willing IELTS/OET/PTE if required:</td>
                <td style="padding: 8px 0;">${completedOrWillingEnglishTest === 'yes' ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">At least 1 year clinical experience:</td>
                <td style="padding: 8px 0;">${hasClinicalExperience === 'yes' ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Currently practising as a nurse:</td>
                <td style="padding: 8px 0;">${currentlyPractisingNurse === 'yes' ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Holds a valid passport:</td>
                <td style="padding: 8px 0;">${hasValidPassport === 'yes' ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Can commit to weekly study time:</td>
                <td style="padding: 8px 0;">${canCommitStudyTime === 'yes' ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Prepared to follow a structured preparation plan:</td>
                <td style="padding: 8px 0;">${preparedStructuredPlan === 'yes' ? 'Yes' : 'No'}</td>
              </tr>
              ${additionalInfo ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Additional Info:</td>
                <td style="padding: 8px 0;">${additionalInfo}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0;"><strong>Action Required:</strong></p>
            <p style="margin: 5px 0 0 0;">Please review the eligibility information and update the eligibility status in the admin panel. Contact the user with the results.</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated notification from EdTec Online Student Management System.
          </p>
        </div>
      </body>
      </html>
    `

    // Send both emails (always send regardless of eligibility status)
    const [thankYouResult, adminResult] = await Promise.allSettled([
      resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@edtec.online',
        to: email,
        subject: `Eligibility Check Submitted for ${courseName}`,
        html: thankYouEmailHtml,
      }),
      resend.emails.send({
        from: process.env.FROM_EMAIL || 'noreply@edtec.online',
        to: 'hello@edtec.online',
        subject: `New Eligibility Check: ${courseName} - ${name}`,
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

    // If user is eligible, automatically show interest
    let interestShown = false;
    if (finalEligibilityStatus === 'eligible') {
      try {
        // Check if interest already exists
        const { data: existingInterest } = await supabase
          .from('course_interests')
          .select('id')
          .eq('course_id', courseId)
          .eq('email', email.toLowerCase().trim())
          .maybeSingle()

        // Only show interest if it doesn't already exist
        if (!existingInterest) {
          const { error: interestError } = await supabase
            .from('course_interests')
            .insert({
              course_id: courseId,
              email: email.toLowerCase().trim(),
              name: name.trim(),
              mobile: mobile.trim(),
              region: region.trim(),
              user_id: databaseUserId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })

          if (!interestError) {
            interestShown = true;
            
            // Send interest confirmation email
            const interestEmailHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Interest Shown - ${courseName}</title>
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0;">EdTec Online</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Interest Registered</p>
                </div>
                
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <h2 style="color: #333; margin-top: 0;">Hello ${name},</h2>
                  
                  <p style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px; color: #155724;">
                    <strong>Great News!</strong> Based on your preliminary responses, you appear eligible to proceed with <strong>${courseName}</strong>. We have automatically registered your interest in this course.
                  </p>
                  
                  <p>Our team will contact you at <strong>${email}</strong> or <strong>${mobile}</strong> within the next few business days with more information about the course and next steps.</p>
                  
                  <div style="background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0;"><strong>What's Next?</strong></p>
                    <p style="margin: 5px 0 0 0;">We'll reach out to you soon to discuss enrollment options, course details, and answer any questions you may have.</p>
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

            // Send interest confirmation email
            try {
              await resend.emails.send({
                from: process.env.FROM_EMAIL || 'noreply@edtec.online',
                to: email,
                subject: `Interest Registered - ${courseName}`,
                html: interestEmailHtml,
              })
            } catch (emailError) {
              console.error('Failed to send interest confirmation email:', emailError)
            }
          } else {
            console.error('Failed to automatically show interest:', interestError)
          }
        }
      } catch (error) {
        console.error('Error automatically showing interest:', error)
        // Continue even if interest showing fails
      }
    }

    // Return success even if one email fails (we still want to acknowledge the submission)
    return NextResponse.json(
      {
        success: true,
        message: 'Eligibility check submitted successfully. Thank you!',
        eligibilityStatus: finalEligibilityStatus,
        interestShown: interestShown,
      },
      { 
        status: 200,
        headers: corsHeaders,
      }
    )
  } catch (error) {
    console.error('Course eligibility submission error:', error)
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
    const { data: eligibility, error } = await supabase
      .from('course_eligibility')
      .select('id, eligibility_status, created_at')
      .eq('course_id', parseInt(courseId))
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking eligibility:', error)
      return NextResponse.json(
        { error: 'Failed to check eligibility status' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      {
        success: true,
        hasCheckedEligibility: !!eligibility,
        eligibilityStatus: eligibility?.eligibility_status || null,
        submittedAt: eligibility?.created_at || null,
      },
      { 
        status: 200,
        headers: corsHeaders,
      }
    )
  } catch (error) {
    console.error('Error checking eligibility status:', error)
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
