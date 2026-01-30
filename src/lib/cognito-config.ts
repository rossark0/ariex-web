/**
 * API Configuration
 *
 * The backend handles all Cognito authentication internally.
 * The frontend just calls the API endpoints.
 */

/**
 * API URL for backend authentication endpoints
 * The backend handles Cognito authentication - we just call REST endpoints
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL

/**
 * Check if mock auth is enabled for development
 */
export const USE_MOCK_AUTH = process.env.NEXT_PUBLIC_AUTH_BYPASS === 'true';
