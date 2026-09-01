import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, formatResponse, formatAuthError } from '@/lib/api/supabase';
import { requireAuth } from '@/lib/api/auth';
import { corsHeaders } from '@/lib/api/utils';

/**
 * GET /api/documents/[id]
 * Get document by ID
 * PUT /api/documents/[id]
 * Update document
 * DELETE /api/documents/[id]
 * Delete document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient();
    const documentId = params.id;

    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !document) {
      return NextResponse.json(
        formatResponse(false, null, 'Document not found'),
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, document, 'Document fetched successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Get document error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to fetch document'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const documentId = params.id;
    const supabase = getSupabaseClient();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.rejection_reason !== undefined) updateData.rejection_reason = body.rejection_reason;

    // If status is verified, set verified_at
    if (body.status === 'verified') {
      updateData.verified_at = new Date().toISOString();
    }

    const { data: document, error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single();

    if (error || !document) {
      return NextResponse.json(
        formatResponse(false, null, 'Document not found or update failed'),
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, document, 'Document updated successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Update document error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to update document'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        formatAuthError(authResult.error || 'Unauthorized', authResult.error_code || 'UNAUTHORIZED'),
        { status: 401, headers: corsHeaders }
      );
    }

    const documentId = params.id;
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (error) {
      console.error('Error deleting document:', error);
      return NextResponse.json(
        formatResponse(false, null, 'Failed to delete document'),
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      formatResponse(true, null, 'Document deleted successfully'),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      formatResponse(false, null, 'Failed to delete document'),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

