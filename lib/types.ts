// Shared types for EdTec applications
export type UserRole = 'student' | 'admin' | 'super_admin'

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  access_token: string;
  token_type: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    avatar?: string;
    created_at?: string;
    updated_at?: string;
  };
}

export interface ApiError {
  detail: string;
}

export interface CrossAppAuthData {
  isAuthenticated: boolean;
  user: User;
  accessToken: string;
}
