/**
 * Auth Types
 * Contains type definitions for authentication-related data
 */
import { User } from '@supabase/supabase-js';

// Alias for Supabase User type to make it easier to extend in the future
export type AuthUser = User;

// Type for authentication state
export type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
};

// Type for login credentials
export type LoginCredentials = {
  email: string;
  password: string;
};

// Type for registration data
export type RegistrationData = {
  email: string;
  password: string;
  confirmPassword?: string;
};

// Type for password reset
export type PasswordResetData = {
  email: string;
};

// Type for password update
export type PasswordUpdateData = {
  password: string;
  confirmPassword: string;
}; 