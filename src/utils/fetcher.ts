/**
 * Generic fetcher utility for API calls
 * Can be used with SWR or other data fetching libraries
 */

export interface FetcherOptions extends RequestInit {
  baseUrl?: string;
}

export class FetchError extends Error {
  info: any;
  status: number;

  constructor(message: string, status: number, info?: any) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
    this.info = info;
  }
}

/**
 * Generic fetcher function
 */
export async function fetcher<T = any>(url: string, options?: FetcherOptions): Promise<T> {
  const { baseUrl, ...fetchOptions } = options || {};
  const fullUrl = baseUrl ? `${baseUrl}${url}` : url;

  const response = await fetch(fullUrl, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions?.headers,
    },
  });

  if (!response.ok) {
    const info = await response.json().catch(() => ({}));
    throw new FetchError(
      info.message || 'An error occurred while fetching the data',
      response.status,
      info
    );
  }

  return response.json();
}

/**
 * GET request
 */
export async function get<T = any>(url: string, options?: FetcherOptions): Promise<T> {
  return fetcher<T>(url, { ...options, method: 'GET' });
}

/**
 * POST request
 */
export async function post<T = any>(url: string, data?: any, options?: FetcherOptions): Promise<T> {
  return fetcher<T>(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request
 */
export async function put<T = any>(url: string, data?: any, options?: FetcherOptions): Promise<T> {
  return fetcher<T>(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PATCH request
 */
export async function patch<T = any>(
  url: string,
  data?: any,
  options?: FetcherOptions
): Promise<T> {
  return fetcher<T>(url, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request
 */
export async function del<T = any>(url: string, options?: FetcherOptions): Promise<T> {
  return fetcher<T>(url, { ...options, method: 'DELETE' });
}
