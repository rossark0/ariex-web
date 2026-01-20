'use server';

import { cookies } from 'next/headers';
import { API_URL } from '@/lib/cognito-config';

// ============================================================================
// Types
// ============================================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  expiresIn?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'CLIENT' | 'STRATEGIST' | 'COMPLIANCE';
  cognitoSub?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  tokens?: AuthTokens;
  user?: AuthUser;
  error?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  name: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface PasswordChallengeResponse {
  challenge: 'NEW_PASSWORD_REQUIRED';
  session: string;
  username: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  // DEBUG: Log request details
  console.log(`[Auth DEBUG] Request: ${options.method || 'GET'} ${url}`);
  if (options.body) {
    // Don't log passwords
    const bodyData = JSON.parse(options.body as string);
    const safeBody = { ...bodyData };
    if (safeBody.password) safeBody.password = '***HIDDEN***';
    if (safeBody.newPassword) safeBody.newPassword = '***HIDDEN***';
    console.log('[Auth DEBUG] Body:', JSON.stringify(safeBody, null, 2));
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  // DEBUG: Log response
  console.log(`[Auth DEBUG] Response status: ${response.status}`);
  console.log('[Auth DEBUG] Response data:', JSON.stringify(data, null, 2));

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Request failed');
  }

  return data;
}

async function authenticatedRequest<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

// ============================================================================
// Token Management
// ============================================================================

export async function setAuthCookies(tokens: AuthTokens): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';

  cookieStore.set('ariex_access_token', tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: tokens.expiresIn || 60 * 60,
  });

  cookieStore.set('ariex_refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  if (tokens.idToken) {
    cookieStore.set('ariex_id_token', tokens.idToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: tokens.expiresIn || 60 * 60,
    });
  }
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('ariex_access_token');
  cookieStore.delete('ariex_refresh_token');
  cookieStore.delete('ariex_id_token');
  cookieStore.delete('ariex_user_role');
  cookieStore.delete('ariex_user_id');
}

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('ariex_access_token')?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('ariex_refresh_token')?.value;
}

// ============================================================================
// Authentication Actions
// ============================================================================

/**
 * Register a new user with Cognito and auto-assign STRATEGIST role
 */
export async function signUp(data: SignUpData): Promise<AuthResponse> {
  try {
    // Step 1: Register user with Cognito via backend
    const signupResult = await apiRequest<{
      message: string;
      userId?: string;
      cognitoSub?: string;
      sub?: string;
    }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        fullName: data.name, // API expects fullName
      }),
    });

    console.log('[Auth] Signup result:', signupResult);

    return {
      success: true,
      message: signupResult.message || 'Registration successful. Please check your email.',
    };
  } catch (error) {
    console.error('[Auth] Signup error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    };
  }
}

/**
 * Sign in user with email and password
 * After getting tokens, fetch user data using cognitoSub
 */
export async function signIn(
  data: SignInData
): Promise<AuthResponse & { passwordChallenge?: PasswordChallengeResponse }> {
  try {
    // Step 1: Authenticate with Cognito via backend
    const authResult = await apiRequest<{
      accessToken?: string;
      refreshToken?: string;
      idToken?: string;
      expiresIn?: number;
      sub?: string;
      cognitoSub?: string;
      // Challenge response fields for NEW_PASSWORD_REQUIRED
      challenge?: 'NEW_PASSWORD_REQUIRED';
      session?: string;
    }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        password: data.password,
      }),
    });

    console.log('[Auth] SignIn response:', JSON.stringify(authResult, null, 2));

    // Check if password change is required (for invited users)
    if (authResult.challenge === 'NEW_PASSWORD_REQUIRED' && authResult.session) {
      console.log('[Auth] Password change required for user');
      return {
        success: false,
        error: 'Password change required',
        passwordChallenge: {
          challenge: 'NEW_PASSWORD_REQUIRED',
          session: authResult.session,
          username: data.email,
        },
      };
    }

    // Ensure we have tokens for normal login
    if (!authResult.accessToken || !authResult.refreshToken) {
      throw new Error('Invalid authentication response');
    }

    // Store tokens in cookies
    await setAuthCookies({
      accessToken: authResult.accessToken,
      refreshToken: authResult.refreshToken,
      idToken: authResult.idToken,
      expiresIn: authResult.expiresIn,
    });

    // Step 2: Get user data from response
    // The API returns user object directly in the response
    const responseUser = (
      authResult as { user?: { id: string; email: string; name?: string; cognitoSub?: string } }
    ).user;
    const cognitoSub = responseUser?.cognitoSub || authResult.sub || authResult.cognitoSub;

    // console.log('[Auth] Response user:', responseUser);
    // console.log('[Auth] CognitoSub:', cognitoSub);

    // Build user from response data first
    let user: AuthUser | undefined;

    // If we have user data in the response, use it
    if (responseUser) {
      user = {
        id: responseUser.id,
        email: responseUser.email,
        name: responseUser.name || data.email.split('@')[0], // Use email prefix as fallback name
        role: 'STRATEGIST', // Default, will be updated if we can fetch roles
        cognitoSub: responseUser.cognitoSub || cognitoSub,
      };
    }

    // Step 3: Try to fetch full user data with roles using cognitoSub
    if (cognitoSub) {
      try {
        const userData = await authenticatedRequest<{
          id: string;
          email: string;
          name?: string;
          cognitoSub?: string;
          roles?: { roleType: string }[];
        }>(`/users/cognito/${cognitoSub}`, authResult.accessToken);

        // console.log('[Auth] User data from API:', JSON.stringify(userData, null, 2));

        // Extract role from roles array
        const roleType = userData.roles?.[0]?.roleType || 'STRATEGIST';

        user = {
          id: userData.id,
          email: userData.email,
          name: userData.name || user?.name || data.email.split('@')[0],
          role: roleType as AuthUser['role'],
          cognitoSub: userData.cognitoSub || cognitoSub,
        };
      } catch (userError) {
        // console.error('[Auth] Failed to fetch user data:', userError);
        // Keep the user from response if API call fails
      }
    }

    // Fallback if no user data
    if (!user) {
      user = {
        id: responseUser?.id || 'unknown',
        email: data.email,
        name: data.email.split('@')[0], // Use email prefix as name
        role: 'STRATEGIST',
        cognitoSub: cognitoSub,
      };
    }

    // console.log('[Auth] Final user:', user);

    // Store user info in cookies for middleware
    const cookieStore = await cookies();
    cookieStore.set('ariex_user_role', user.role, {
      path: '/',
      maxAge: 60 * 60 * 24,
    });
    cookieStore.set('ariex_user_id', user.id, {
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return {
      success: true,
      tokens: {
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        idToken: authResult.idToken,
        expiresIn: authResult.expiresIn,
      },
      user,
    };
  } catch (error) {
    // console.error('[Auth] SignIn error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sign in failed',
    };
  }
}

/**
 * Confirm email with verification code, then create user in DB with STRATEGIST role
 */
export async function confirmEmail(email: string, code: string): Promise<AuthResponse> {
  try {
    // Step 1: Confirm email with Cognito
    const result = await apiRequest<{
      message: string;
      cognitoSub?: string;
      sub?: string;
    }>('/auth/confirm-email', {
      method: 'POST',
      body: JSON.stringify({ email, confirmationCode: code }),
    });

    // console.log('[Auth] Email confirmation result:', result);

    // Step 2: Create user in database with STRATEGIST role
    // This happens after email confirmation so we have a verified user
    const cognitoSub = result.cognitoSub || result.sub;

    if (cognitoSub) {
      try {
        // Create user in database
        const createUserResult = await apiRequest<{ id: string }>('/users', {
          method: 'POST',
          body: JSON.stringify({
            email,
            cognitoSub,
          }),
        });

        // console.log('[Auth] Created user:', createUserResult);

        // Assign STRATEGIST role to new user
        await apiRequest(`/users/${createUserResult.id}/roles`, {
          method: 'POST',
          body: JSON.stringify({
            roleType: 'STRATEGIST',
          }),
        });

        // console.log('[Auth] Assigned STRATEGIST role to user');
      } catch (createError) {
        // User might already exist, which is fine
        // console.log('[Auth] User creation skipped (may already exist):', createError);
      }
    }

    return {
      success: true,
      message: result.message || 'Email confirmed successfully',
    };
  } catch (error) {
    // console.error('[Auth] Email confirmation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Email confirmation failed',
    };
  }
}

/**
 * Complete password challenge for invited users
 * Called when login returns NEW_PASSWORD_REQUIRED challenge
 */
export async function completePassword(
  username: string,
  newPassword: string,
  session: string
): Promise<AuthResponse> {
  try {
    const authResult = await apiRequest<{
      accessToken: string;
      refreshToken: string;
      idToken?: string;
      expiresIn?: number;
      sub?: string;
      cognitoSub?: string;
      user?: { id: string; email: string; name?: string; cognitoSub?: string };
    }>('/auth/complete-password', {
      method: 'POST',
      body: JSON.stringify({
        username,
        newPassword,
        session,
      }),
    });

    // console.log('[Auth] Complete password response:', JSON.stringify(authResult, null, 2));

    // Store tokens in cookies
    await setAuthCookies({
      accessToken: authResult.accessToken,
      refreshToken: authResult.refreshToken,
      idToken: authResult.idToken,
      expiresIn: authResult.expiresIn,
    });

    // Build user from response
    const responseUser = authResult.user;
    const cognitoSub = responseUser?.cognitoSub || authResult.sub || authResult.cognitoSub;

    let user: AuthUser | undefined;

    if (responseUser) {
      user = {
        id: responseUser.id,
        email: responseUser.email,
        name: responseUser.name || username.split('@')[0],
        role: 'CLIENT', // Invited users are clients
        cognitoSub: responseUser.cognitoSub || cognitoSub,
      };
    }

    // Try to fetch full user data with roles
    if (cognitoSub) {
      try {
        const userData = await authenticatedRequest<{
          id: string;
          email: string;
          name?: string;
          cognitoSub?: string;
          roles?: { roleType: string }[];
        }>(`/users/cognito/${cognitoSub}`, authResult.accessToken);

        // console.log('[Auth] User data from API:', JSON.stringify(userData, null, 2));

        const roleType = userData.roles?.[0]?.roleType || 'CLIENT';

        user = {
          id: userData.id,
          email: userData.email,
          name: userData.name || user?.name || username.split('@')[0],
          role: roleType as AuthUser['role'],
          cognitoSub: userData.cognitoSub || cognitoSub,
        };
      } catch (userError) {
        // console.error('[Auth] Failed to fetch user data:', userError);
      }
    }

    // Fallback if no user data
    if (!user) {
      user = {
        id: responseUser?.id || 'unknown',
        email: username,
        name: username.split('@')[0],
        role: 'CLIENT',
        cognitoSub: cognitoSub,
      };
    }

    // console.log('[Auth] Final user after password completion:', user);

    // Store user info in cookies for middleware
    const cookieStore = await cookies();
    cookieStore.set('ariex_user_role', user.role, {
      path: '/',
      maxAge: 60 * 60 * 24,
    });
    cookieStore.set('ariex_user_id', user.id, {
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return {
      success: true,
      tokens: {
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        idToken: authResult.idToken,
        expiresIn: authResult.expiresIn,
      },
      user,
    };
  } catch (error) {
    // console.error('[Auth] Complete password error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete password setup',
    };
  }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(): Promise<AuthResponse> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return { success: false, error: 'No refresh token available' };
    }

    const result = await apiRequest<{
      accessToken: string;
      refreshToken?: string;
      idToken?: string;
      expiresIn?: number;
    }>('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    await setAuthCookies({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken || refreshToken,
      idToken: result.idToken,
      expiresIn: result.expiresIn,
    });

    return {
      success: true,
      tokens: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken || refreshToken,
        idToken: result.idToken,
        expiresIn: result.expiresIn,
      },
    };
  } catch (error) {
    await clearAuthCookies();
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token refresh failed',
    };
  }
}

/**
 * Initiate password reset
 */
export async function forgotPassword(email: string): Promise<AuthResponse> {
  try {
    const result = await apiRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    return {
      success: true,
      message: result.message || 'Password reset email sent',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initiate password reset',
    };
  }
}

/**
 * Complete password reset
 */
export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string
): Promise<AuthResponse> {
  try {
    const result = await apiRequest<{ message: string }>('/auth/confirm-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    });

    return {
      success: true,
      message: result.message || 'Password reset successful',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Password reset failed',
    };
  }
}

/**
 * Change password for authenticated user
 */
export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<AuthResponse> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return { success: false, error: 'Not authenticated' };
    }

    const result = await authenticatedRequest<{ message: string }>(
      '/auth/change-password',
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword }),
      }
    );

    return {
      success: true,
      message: result.message || 'Password changed successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Password change failed',
    };
  }
}

/**
 * Verify the current access token
 */
export async function verifyToken(): Promise<AuthResponse> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return { success: false, error: 'No access token' };
    }

    const result = await apiRequest<{ valid: boolean; user?: AuthUser }>('/auth/verify-token', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!result.valid) {
      return { success: false, error: 'Invalid token' };
    }

    return {
      success: true,
      user: result.user,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token verification failed',
    };
  }
}

/**
 * Sign out user
 */
export async function signOut(): Promise<AuthResponse> {
  try {
    const accessToken = await getAccessToken();

    if (accessToken) {
      await apiRequest('/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).catch(() => {});
    }

    await clearAuthCookies();
    return { success: true, message: 'Signed out successfully' };
  } catch {
    await clearAuthCookies();
    return { success: true, message: 'Signed out' };
  }
}

/**
 * Get user by Cognito subject ID
 */
export async function getUserByCognitoSub(cognitoSub: string): Promise<AuthUser | null> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return null;

    const userData = await authenticatedRequest<{
      id: string;
      email: string;
      name?: string;
      roles?: { roleType: string }[];
    }>(`/users/cognito/${cognitoSub}`, accessToken);

    const roleType = userData.roles?.[0]?.roleType || 'STRATEGIST';

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name || null,
      role: roleType as AuthUser['role'],
      cognitoSub,
    };
  } catch {
    return null;
  }
}

/**
 * Get current authenticated user from cookies and API
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      // console.log('[Auth] getCurrentUser: No access token');
      return null;
    }

    // Try to get user info from cookies first
    const cookieStore = await cookies();
    const userId = cookieStore.get('ariex_user_id')?.value;
    const userRole = cookieStore.get('ariex_user_role')?.value;

    // console.log('[Auth] getCurrentUser: userId=', userId, 'role=', userRole);

    // If we have userId, fetch the full user from API
    if (userId && userId !== 'unknown') {
      try {
        const userData = await authenticatedRequest<{
          id: string;
          email: string;
          name?: string;
          cognitoSub?: string;
          roles?: { roleType: string }[];
        }>(`/users/${userId}`, accessToken);

        const roleType = userData.roles?.[0]?.roleType || userRole || 'STRATEGIST';

        return {
          id: userData.id,
          email: userData.email,
          name: userData.name || null,
          role: roleType as AuthUser['role'],
          cognitoSub: userData.cognitoSub,
        };
      } catch (error) {
        // console.error('[Auth] Failed to fetch user by ID:', error);
      }
    }

    // Fallback: return minimal user from cookies
    if (userRole) {
      return {
        id: userId || 'unknown',
        email: '',
        name: null,
        role: userRole as AuthUser['role'],
      };
    }

    return null;
  } catch (error) {
    // console.error('[Auth] getCurrentUser error:', error);
    return null;
  }
}
