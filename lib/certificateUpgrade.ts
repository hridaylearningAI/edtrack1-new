/**
 * Certificate upgrade utilities for the Student Management System
 * Handles fetching upgrade details and confirming upgrade payments
 */

export interface CertificateUpgradeDetails {
  enrollment_id: number;
  course_id: number;
  course_name: string;
  upgrade_price: number;
  original_upgrade_price: number;
  discount_applied: number;
}

export interface CertificateUpgradeResponse {
  success: boolean;
  data?: CertificateUpgradeDetails;
  message?: string;
  error?: string;
}

/**
 * Get certificate upgrade details for an enrollment
 * Uses GET /api/enrollments/[id]/upgrade-certificate
 */
export async function getCertificateUpgradeDetails(
  enrollmentId: number,
  token: string
): Promise<CertificateUpgradeResponse> {
  try {
    const response = await fetch(
      `/api/enrollments/${enrollmentId}/upgrade-certificate`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || result.error || 'Failed to get upgrade details',
      };
    }

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.message || result.error || 'Upgrade not available',
      };
    }

    return {
      success: true,
      data: result.data,
      message: result.message,
    };
  } catch (error) {
    console.error('Error getting certificate upgrade details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get upgrade details',
    };
  }
}

/**
 * Create a Stripe Checkout Session for certificate upgrade
 * Returns the checkout URL to redirect the user to Stripe's checkout page
 */
export async function createUpgradeCheckoutSession(
  enrollmentId: number,
  token: string,
  returnPath: string = '/student/current-units'
): Promise<{ url: string } | { error: string }> {
  try {
    const response = await fetch(
      `/api/enrollments/${enrollmentId}/upgrade-certificate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ return_path: returnPath }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      return {
        error: result.message || result.error || 'Failed to create checkout session',
      };
    }

    if (!result.data?.url) {
      return { error: 'Invalid checkout session response' };
    }

    return { url: result.data.url };
  } catch (error) {
    console.error('Error creating upgrade checkout session:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    };
  }
}

/**
 * Fulfill certificate upgrade after user returns from Stripe Checkout
 * Called when user lands on success page with session_id
 */
export async function fulfillCertificateUpgrade(
  sessionId: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/payments/fulfill-certificate-upgrade', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id: sessionId }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || result.error || 'Failed to fulfill upgrade',
      };
    }

    return { success: result.success ?? true, error: result.message };
  } catch (error) {
    console.error('Error fulfilling certificate upgrade:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fulfill upgrade',
    };
  }
}
