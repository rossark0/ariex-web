'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Clean up authentication cookies and redirect to home
 * Called when user signs out or authentication fails
 */
export async function signOutCleanup() {
  const cookieStore = await cookies();

  // Delete Firebase authentication cookies
  cookieStore.delete('firebase.accessToken');
  cookieStore.delete('firebase.refreshToken');

  // Redirect to home page
  redirect('/');
}

/**
 * Set Firebase authentication tokens in cookies
 */
export async function setAuthTokens(accessToken: string, refreshToken?: string) {
  const cookieStore = await cookies();

  cookieStore.set('firebase.accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  if (refreshToken) {
    cookieStore.set('firebase.refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }
}

/**
 * Get Firebase access token from cookies
 */
export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('firebase.accessToken')?.value;
}

/**
 * Get Firebase refresh token from cookies
 */
export async function getRefreshToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('firebase.refreshToken')?.value;
}
