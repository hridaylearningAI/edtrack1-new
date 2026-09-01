import { NextRequest, NextResponse } from 'next/server';

const getApiUrl = (endpoint: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 
                  'https://ynsgylbe05.execute-api.us-east-1.amazonaws.com/dev/api';
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }


    // Consume the token with the backend API
    const response = await fetch(getApiUrl('/cross-app-auth/consume-token'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to consume token' }));
      return NextResponse.json(
        { success: false, error: errorData.error || 'Failed to consume token' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (data.success && data.user_data && data.access_token) {
      return NextResponse.json({
        success: true,
        user_data: data.user_data,
        access_token: data.access_token,
        message: 'Token consumed successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: data.error || 'Invalid token response' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('❌ Error consuming cross-app auth token:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
