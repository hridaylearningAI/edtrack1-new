// Authentication service for EdTec Student Management System (Next.js)
import { User, AuthState, LoginCredentials, LoginResponse } from './types';

// Configuration for cross-app integration
const config = {
  // Portfolio App URL
  portfolioAppUrl: process.env.NEXT_PUBLIC_PORTFOLIO_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://edtec.online' 
      : 'http://localhost:5173'),
  
  // Authentication cookie name
  authCookieName: 'edtec_auth',
  
  // Cookie expiration (24 hours)
  cookieMaxAge: 86400,
  
  // API Base URL - use local Next.js API routes
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api'
};

// API URL helper function
const getApiUrl = (endpoint: string): string => {
  return `${config.apiBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

import { setCrossAppAuthCookie, clearCrossAppAuthCookie } from './crossAppAuth';

class AuthService {
  private static instance: AuthService;
  private authState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };
  private accessToken: string | null = null;
  private listeners: Array<(state: AuthState) => void> = [];
  private initialized: boolean = false;

  private constructor() {
    // Constructor should not initialize anything - defer to lazy initialization
    // This prevents any browser-only code from running during SSR
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Ensure initialization on client side
  private async ensureInitialized(): Promise<void> {
    if (typeof window !== 'undefined' && !this.initialized) {
      this.loadAuthState();
      await this.checkCrossAppAuth();
      this.initialized = true;
    }
  }

  // Public methods that ensure initialization
  getAuthState(): AuthState {
    // Don't await here to avoid blocking synchronous calls
    this.ensureInitialized().catch(console.error);
    return this.authState;
  }

  isAuthenticated(): boolean {
    // Don't await here to avoid blocking synchronous calls
    this.ensureInitialized().catch(console.error);
    return this.authState.isAuthenticated;
  }

  // Check for cross-app authentication from portfolio app
  private async checkCrossAppAuth() {
    if (typeof window !== 'undefined') {
      try {
        
        // Check URL parameters (primary method for cross-domain)
        const urlParams = new URLSearchParams(window.location.search);
        const authParam = urlParams.get('auth');
        
        if (authParam) {
          try {
            const authData = JSON.parse(decodeURIComponent(authParam));
            
            // Check if auth data is recent (within 5 minutes)
            const now = Date.now();
            const authTime = authData.timestamp || 0;
            const timeDiff = now - authTime;
            const maxAge = 5 * 60 * 1000; // 5 minutes
            
            if (timeDiff > maxAge) {
              // Clear the URL parameter
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete('auth');
              window.history.replaceState({}, '', newUrl.toString());
              return;
            }
            
            if (authData.isAuthenticated && authData.user && authData.accessToken) {
              
              // Verify the token with the server
              try {
                const verifyResponse = await fetch('/api/verify-auth', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    accessToken: authData.accessToken
                  })
                });

                if (verifyResponse.ok) {
                  const verifyData = await verifyResponse.json();
                  if (verifyData.success) {
                    this.accessToken = authData.accessToken;
                    this.authState = {
                      user: authData.user,
                      isAuthenticated: true,
                      isLoading: false,
                      error: null,
                    };
                    this.saveAuthState();
                    this.notifyListeners();
                    
                    // Clear the URL parameter for security
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.delete('auth');
                    window.history.replaceState({}, '', newUrl.toString());
                    
                    return;
                  } else {
                  }
                } else {
                }
              } catch (error) {
                console.error('❌ Error during server verification:', error);
              }
            } else {
            }
          } catch (error) {
            console.error('❌ Error parsing auth data from URL:', error);
          }
        } else {
        }
      } catch (error) {
        console.error('Error checking cross-app auth:', error);
      }
    }
  }

  // Subscribe to auth state changes
  subscribe(listener: (state: AuthState) => void): () => void {
    // Don't await here to avoid blocking synchronous calls
    this.ensureInitialized().catch(console.error);
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners of auth state changes
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.authState));
  }

  private loadAuthState() {
    if (typeof window !== 'undefined') {
      try {
        const savedState = localStorage.getItem('edtec_auth');
        if (savedState) {
          const parsed = JSON.parse(savedState);
          this.authState = { ...this.authState, ...parsed };
          this.accessToken = parsed.accessToken || null;
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
      }
    }
  }

  private saveAuthState() {
    if (typeof window !== 'undefined') {
      try {
        const stateToSave = {
          ...this.authState,
          accessToken: this.accessToken
        };
        localStorage.setItem('edtec_auth', JSON.stringify(stateToSave));
      } catch (error) {
        console.error('Error saving auth state:', error);
      }
    }
  }

  // Public methods
  getCurrentUser(): User | null {
    // Don't await here to avoid blocking synchronous calls
    this.ensureInitialized().catch(console.error);
    return this.authState.user;
  }

  hasRole(role: 'student' | 'admin'): boolean {
    // Don't await here to avoid blocking synchronous calls
    this.ensureInitialized().catch(console.error);
    return this.authState.user?.role === role;
  }

  getAccessToken(): string | null {
    // Don't await here to avoid blocking synchronous calls
    this.ensureInitialized().catch(console.error);
    return this.accessToken;
  }

  // Real API login method
  async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; error?: string }> {
    await this.ensureInitialized();
    this.authState.isLoading = true;
    this.authState.error = null;
    this.notifyListeners();

    try {
      const response = await fetch(getApiUrl('/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
        throw new Error(errorData.detail || 'Login failed');
      }

      const data: LoginResponse = await response.json();
      
      if (data.success && data.access_token) {
        this.accessToken = data.access_token;
        
        // Transform API user data to match our interface
        const user: User = {
          id: data.user.id.toString(),
          email: data.user.email,
          name: data.user.name,
          role: data.user.role as 'student' | 'admin',
          avatar: data.user.avatar,
          createdAt: data.user.created_at || new Date().toISOString(),
        };

        // Login successful - create new auth state object
        this.authState = {
          user: user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        };

        this.saveAuthState();
        
        // Set authentication cookie for middleware
        if (typeof window !== 'undefined') {
          const cookieValue = JSON.stringify({
            isAuthenticated: true,
            user,
            accessToken: this.accessToken
          });
          document.cookie = `${config.authCookieName}=${encodeURIComponent(cookieValue)}; path=/; max-age=${config.cookieMaxAge}; SameSite=Lax`;
        }
        
        // Set cross-app authentication cookie for portfolio app
        setCrossAppAuthCookie({
          isAuthenticated: true,
          user,
          accessToken: this.accessToken
        });
        
        this.notifyListeners();

        return { success: true, user };
      } else {
        this.authState = {
          ...this.authState,
          error: 'Login failed',
          isLoading: false,
        };
        this.notifyListeners();
        return { success: false, error: 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      this.authState = {
        ...this.authState,
        error: 'Network error. Please check your connection.',
        isLoading: false,
      };
      this.notifyListeners();
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  }

  // Check if user can access a specific path
  canAccessPath(path: string): boolean {
    // Don't await here to avoid blocking synchronous calls
    this.ensureInitialized().catch(console.error);
    if (!this.authState.isAuthenticated) {
      return path === '/login' || path === '/';
    }

    const userRole = this.authState.user?.role;
    
    if (path.startsWith('/admin')) {
      return userRole === 'admin';
    }
    
    if (path.startsWith('/student')) {
      return userRole === 'student';
    }

    return true; // Allow access to other paths
  }

  // Redirect based on user role
  getRedirectPath(): string {
    // Don't await here to avoid blocking synchronous calls
    this.ensureInitialized().catch(console.error);
    if (!this.authState.user) return '/login';
    
    switch (this.authState.user.role) {
      case 'admin':
        return '/admin';
      case 'student':
        return '/student';
      default:
        return '/login';
    }
  }

  // Set user from external auth (from portfolio app)
  setUser(user: User, accessToken?: string) {
    // Don't await here to avoid blocking synchronous calls
    this.ensureInitialized().catch(console.error);
    this.authState.user = user;
    this.authState.isAuthenticated = true;
    this.authState.error = null;
    if (accessToken) {
      this.accessToken = accessToken;
    }
    this.saveAuthState();
    
    // Set authentication cookie for middleware
    if (typeof window !== 'undefined') {
      const cookieValue = JSON.stringify({
        isAuthenticated: true,
        user,
        accessToken: this.accessToken
      });
      document.cookie = `${config.authCookieName}=${encodeURIComponent(cookieValue)}; path=/; max-age=${config.cookieMaxAge}; SameSite=Lax`;
    }
    
    this.notifyListeners();
  }

  // Refresh user data from API
  async refreshUser(): Promise<User | null> {
    await this.ensureInitialized();
    if (!this.accessToken) {
      return null;
    }

    try {
      const apiUrl = getApiUrl('/auth/me');
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });


      if (response.ok) {
        const responseData = await response.json();
        
        // Extract user data from the response structure
        const userData = responseData.data || responseData.user;
        
        // Validate that we have the required user data
        if (!userData || !userData.id || !userData.email || !userData.name) {
          console.error('❌ Invalid user data received:', userData);
          console.error('❌ Missing fields:', {
            id: !!userData?.id,
            email: !!userData?.email,
            name: !!userData?.name
          });
          return null;
        }
        
        const user: User = {
          id: userData.id.toString(),
          email: userData.email,
          name: userData.name,
          role: userData.role as 'student' | 'admin',
          avatar: userData.avatar,
          createdAt: userData.created_at || new Date().toISOString(),
        };

        this.authState.user = user;
        this.saveAuthState();
        this.notifyListeners();
        return user;
      } else {
        const errorText = await response.text();
        console.error('❌ API error response:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Error refreshing user:', error);
    }

    return null;
  }

  async logout(): Promise<void> {
    await this.ensureInitialized();
    try {
      // Call API logout endpoint if token exists
      if (this.accessToken) {
        await fetch(getApiUrl('/auth/logout'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Error during logout API call:', error);
    }

    this.authState.user = null;
    this.authState.isAuthenticated = false;
    this.authState.error = null;
    this.accessToken = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem('edtec_auth');
      localStorage.removeItem('edtec_cross_app_auth');
      
      // Clear authentication cookie
      document.cookie = `${config.authCookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      
      // Clear cross-app authentication cookie
      clearCrossAppAuthCookie();
      
      this.notifyListeners();
      
      // Redirect to portfolio app login page
      window.location.href = config.portfolioAppUrl + '/login';
    }
  }
}

// Lazy initialization to prevent SSR issues
let _authService: AuthService | null = null;

export const getAuthService = (): AuthService => {
  if (typeof window === 'undefined') {
    // Return a mock service for SSR
    return {
      getAuthState: () => ({ user: null, isAuthenticated: false, isLoading: false, error: null }),
      isAuthenticated: () => false,
      login: async () => ({ success: false, message: 'SSR mode' }),
      logout: () => {},
      subscribe: () => () => {},
      getRedirectPath: () => '/',
      // Add all other methods that might be called
      getAccessToken: () => null,
      setAccessToken: () => {},
      clearAccessToken: () => {},
      checkAuthStatus: () => {},
      handleCrossAppAuth: () => {},
      setRedirectPath: () => {},
      clearRedirectPath: () => {},
      refreshUser: async () => null,
    } as any;
  }
  
  if (!_authService) {
    _authService = AuthService.getInstance();
  }
  return _authService;
};

// Export the lazy getter instead of the service instance
export { getAuthService as authService };
export default getAuthService;
