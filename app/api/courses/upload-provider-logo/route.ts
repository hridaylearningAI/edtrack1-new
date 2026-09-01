import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

// Allowed image types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',
];

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB for logos (smaller than banners)

/**
 * POST /api/courses/upload-provider-logo
 * Upload a provider/university logo for Accredited VET Provider courses
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        formatResponse(false, null, 'No file provided'),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        formatResponse(false, null, `File type ${file.type} not allowed. Allowed types: JPEG, PNG, WebP, SVG`),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        formatResponse(false, null, `File size exceeds maximum allowed (2MB)`),
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'png';
    const uniqueFilename = `provider-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
    const filePath = `provider-logos/${uniqueFilename}`;

    // Convert File to ArrayBuffer for Supabase upload
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to Supabase storage (same course-images bucket, different folder)
    const { error: uploadError } = await supabase.storage
      .from('course-images')
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        formatResponse(false, null, `Failed to upload logo: ${uploadError.message}`),
        { status: 500, headers: corsHeaders }
      );
    }

    // Get public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('course-images')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        formatResponse(false, null, 'Failed to get public URL for uploaded logo'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, {
        url: urlData.publicUrl,
        path: filePath,
        filename: uniqueFilename,
      }, 'Provider logo uploaded successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Upload provider logo error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to upload provider logo'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}
