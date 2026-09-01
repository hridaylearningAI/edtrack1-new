import { NextRequest, NextResponse } from 'next/server';

// API URL helper function
const getApiUrl = (endpoint: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 
                  'https://ynsgylbe05.execute-api.us-east-1.amazonaws.com/dev/api';
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Access token is required' },
        { status: 400 }
      );
    }

    // Verify the token with the backend API
    const response = await fetch(getApiUrl('/auth/me'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Invalid access token' },
        { status: 401 }
      );
    }

    const data = await response.json();
    
    if (data.success && data.user) {
      return NextResponse.json({
        success: true,
        user: data.user,
        message: 'Token verified successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid user data' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
