import type { APIResponse } from '@playwright/test';
import type {
  AxiosResponse,
  InternalAxiosRequestConfig,
  RawAxiosResponseHeaders,
} from 'axios';
import { getStatusText } from './shared';

/**
 * Transform Playwright headers to axios headers format
 */
export function transformResponseHeaders(
  headers: Record<string, string>
): RawAxiosResponseHeaders {
  // Playwright returns headers as Record<string, string>
  // axios expects RawAxiosResponseHeaders which is similar
  return headers as RawAxiosResponseHeaders;
}

/**
 * Parse response body based on content type
 */
export async function parseResponseBody(
  response: APIResponse,
  config: InternalAxiosRequestConfig
): Promise<unknown> {
  const contentType = response.headers()['content-type'] || '';
  const responseType = config.responseType || 'json';

  // Handle different response types
  switch (responseType) {
    case 'arraybuffer':
      return (await response.body()).buffer;

    case 'blob':
      const buffer = await response.body();
      return new Blob([buffer], { type: contentType });

    case 'text':
      return response.text();

    case 'stream':
      // Return the body buffer for stream type
      // Users can convert to stream if needed
      return response.body();

    case 'json':
    default:
      // Try to parse as JSON, fall back to text
      if (contentType.includes('application/json')) {
        try {
          return await response.json();
        } catch {
          return response.text();
        }
      }
      // For non-JSON content types, return text
      return response.text();
  }
}

/**
 * Transform Playwright response to axios response
 */
export async function transformResponse<T = unknown>(
  response: APIResponse,
  config: InternalAxiosRequestConfig
): Promise<AxiosResponse<T>> {
  const data = await parseResponseBody(response, config);

  return {
    data: data as T,
    status: response.status(),
    statusText: response.statusText() || getStatusText(response.status()),
    headers: transformResponseHeaders(response.headers()),
    config,
    request: response, // Store the Playwright response as the request object
  };
}
