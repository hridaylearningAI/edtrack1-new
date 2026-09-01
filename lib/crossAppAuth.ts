// Cross-app authentication utilities for EdTec Student Management System
import { User, CrossAppAuthData } from './types';

// Configuration for cross-app integration
export const crossAppConfig = {
  // Portfolio App URL
  portfolioAppUrl: process.env.NEXT_PUBLIC_PORTFOLIO_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://edtec.online' 
      : 'http://localhost:5173'),
  
  // Authentication cookie name
  authCookieName: 'edtec_auth',
  
  // Cookie expiration (24 hours)
  cookieMaxAge: 86400
};

/**
 * Sets authentication data in a cookie that can be shared across applications
 */
export const setCrossAppAuthCookie = (authData: CrossAppAuthData): void => {
  if (typeof window !== 'undefined') {
    try {
      const cookieValue = JSON.stringify(authData);
      
      // Set cookie with proper attributes for cross-domain sharing
      let cookieString = `${crossAppConfig.authCookieName}=${encodeURIComponent(cookieValue)}; path=/; max-age=${crossAppConfig.cookieMaxAge}; SameSite=None; Secure`;
      
      document.cookie = cookieString;
      
      // Verify cookie was set
      
      // Notify other applications about authentication change
      notifyCrossAppAuthChange(authData);
    } catch (error) {
      console.error('Error setting cross-app auth cookie:', error);
    }
  }
};

/**
 * Clears the cross-app authentication cookie
 */
export const clearCrossAppAuthCookie = (): void => {
  if (typeof window !== 'undefined') {
    // Clear cookie with proper attributes
    document.cookie = `${crossAppConfig.authCookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure`;
    
    // Notify other applications about logout
    notifyCrossAppAuthChange({
      isAuthenticated: false,
      user: null as any,
      accessToken: ''
    });
  }
};

/**
 * Gets authentication data from the cross-app cookie
 */
export const getCrossAppAuthData = (): CrossAppAuthData | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    // Check cookies only (localStorage removed for cross-domain compatibility)
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(cookie => 
      cookie.trim().startsWith(`${crossAppConfig.authCookieName}=`)
    );
    
    if (authCookie) {
      const cookieValue = authCookie.split('=')[1];
      return JSON.parse(decodeURIComponent(cookieValue));
    }
  } catch (error) {
    console.error('Error getting cross-app auth data:', error);
  }
  
  return null;
};

/**
 * Notifies other applications about authentication changes using multiple methods
 */
const notifyCrossAppAuthChange = (authData: CrossAppAuthData): void => {
  if (typeof window !== 'undefined') {
    try {
      // Dispatch a custom event for real-time communication
      window.dispatchEvent(new CustomEvent('edtec_auth_change', {
        detail: authData
      }));
      
      // Use postMessage for cross-domain communication
      const targetOrigin = crossAppConfig.portfolioAppUrl;
      if (window.parent !== window) {
        // If we're in an iframe, send message to parent
        window.parent.postMessage({
          type: 'EDTEC_AUTH_CHANGE',
          data: authData
        }, targetOrigin);
      }
      
      // Also try to communicate with other windows/tabs
      if (window.opener) {
        window.opener.postMessage({
          type: 'EDTEC_AUTH_CHANGE',
          data: authData
        }, targetOrigin);
      }
      
    } catch (error) {
      console.error('Error notifying cross-app auth change:', error);
    }
  }
};

/**
 * Listens for authentication changes from other applications
 */
export const listenForCrossAppAuthChanges = (
  callback: (authData: CrossAppAuthData) => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorageChange = (event: StorageEvent) => {
    // Storage events removed - using URL parameters only
    // This function is kept for compatibility but won't be triggered
  };

  const handleCustomEvent = (event: CustomEvent) => {
    callback(event.detail);
  };

  const handlePostMessage = (event: MessageEvent) => {
    // Verify origin for security
    const allowedOrigins = [
      crossAppConfig.portfolioAppUrl,
      'http://localhost:5173',
      'https://edtec.online'
    ];
    
    if (allowedOrigins.some(origin => event.origin.includes(origin.replace(/^https?:\/\//, '')))) {
      if (event.data && event.data.type === 'EDTEC_AUTH_CHANGE') {
        callback(event.data.data);
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('edtec_auth_change', handleCustomEvent as EventListener);
  window.addEventListener('message', handlePostMessage);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('edtec_auth_change', handleCustomEvent as EventListener);
    window.removeEventListener('message', handlePostMessage);
  };
};

/**
 * Redirects to the Portfolio App with authentication
 */
export const redirectToPortfolioApp = (redirectPath?: string): void => {
  if (typeof window !== 'undefined') {
    const url = new URL(crossAppConfig.portfolioAppUrl);
    if (redirectPath) {
      url.pathname = redirectPath;
    }
    window.location.href = url.toString();
  }
};

/**
 * Notifies other applications about purchase changes using localStorage events
 */
export const notifyCrossAppPurchaseChange = (purchaseData: any): void => {
  if (typeof window !== 'undefined') {
    try {
      
      // Store purchase data in localStorage for cross-app communication
      localStorage.setItem('edtec_cross_app_purchase', JSON.stringify(purchaseData));
      
      // Dispatch a custom event for real-time communication
      window.dispatchEvent(new CustomEvent('edtec_purchase_change', {
        detail: purchaseData
      }));
      
    } catch (error) {
      console.error('Error notifying cross-app purchase change:', error);
    }
  }
};

/**
 * Listens for purchase changes from other applications
 */
export const listenForCrossAppPurchaseChanges = (
  callback: (purchaseData: any) => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === 'edtec_cross_app_purchase' && event.newValue) {
      try {
        const purchaseData = JSON.parse(event.newValue);
        callback(purchaseData);
      } catch (error) {
        console.error('Error parsing cross-app purchase data:', error);
      }
    }
  };

  const handleCustomEvent = (event: CustomEvent) => {
    callback(event.detail);
  };

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('edtec_purchase_change', handleCustomEvent as EventListener);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('edtec_purchase_change', handleCustomEvent as EventListener);
  };
};
