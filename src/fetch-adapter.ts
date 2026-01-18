import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { PlaywrightFetchOptions } from './types';
import { getStatusText } from './utils/shared';

/**
 * Options for the Playwright fetch adapter
 */
export type PlaywrightFetchAdapterOptions = Pick<
  PlaywrightFetchOptions,
  'ignoreHTTPSErrors' | 'maxRedirects' | 'maxRetries' | 'timeout'
>;

/**
 * Fetch-compatible function type
 */
export type FetchFunction = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

/**
 * Transform fetch Headers to Record<string, string>
 */
function transformHeaders(headers: RequestInit['headers']): Record<string, string> | undefined {
  if (!headers) return undefined;

  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  if (Array.isArray(headers)) {
    const result: Record<string, string> = {};
    for (const [key, value] of headers) {
      result[key] = value;
    }
    return result;
  }

  return headers as Record<string, string>;
}

/**
 * Transform fetch body to Playwright format
 */
function transformBody(
  body: RequestInit['body'],
  headers: Record<string, string> | undefined
): Pick<PlaywrightFetchOptions, 'data' | 'form' | 'multipart'> {
  if (body === undefined || body === null) {
    return {};
  }

  // FormData -> multipart
  if (body instanceof FormData) {
    const multipart: Record<string, string | { name: string; mimeType: string; buffer: Buffer }> = {};
    body.forEach((value, key) => {
      if (value instanceof Blob) {
        multipart[key] = {
          name: value instanceof File ? value.name : 'blob',
          mimeType: value.type || 'application/octet-stream',
          buffer: value as unknown as Buffer,
        };
      } else {
        multipart[key] = value;
      }
    });
    return { multipart };
  }

  // URLSearchParams -> form
  if (body instanceof URLSearchParams) {
    return { form: Object.fromEntries(body) };
  }

  // Check content-type for form data
  const contentType = headers?.['content-type']?.toLowerCase() || headers?.['Content-Type']?.toLowerCase();

  if (contentType?.includes('application/x-www-form-urlencoded') && typeof body === 'string') {
    return { form: Object.fromEntries(new URLSearchParams(body)) };
  }

  // Default: pass as data (JSON, string, ArrayBuffer, etc.)
  return { data: body };
}

/**
 * Convert Playwright APIResponse to standard Response
 */
async function toResponse(apiResponse: APIResponse): Promise<Response> {
  const body = await apiResponse.body();
  const headers = new Headers(apiResponse.headers());
  const status = apiResponse.status();
  const statusText = apiResponse.statusText() || getStatusText(status);

  return new Response(body, {
    status,
    statusText,
    headers,
  });
}

/**
 * Create a fetch-compatible function using Playwright's APIRequestContext.
 *
 * Use this with better-fetch's `customFetchImpl` option to route requests
 * through Playwright for trace visibility.
 *
 * @example
 * ```typescript
 * import { createFetch } from '@better-fetch/fetch';
 * import { test } from '@playwright/test';
 * import { createPlaywrightFetch } from '@iskyex/axios-playwright-adapter';
 *
 * test('API call shows in trace', async ({ request }) => {
 *   const $fetch = createFetch({
 *     baseURL: 'https://api.example.com',
 *     customFetchImpl: createPlaywrightFetch(request),
 *   });
 *   const { data } = await $fetch('/users');
 * });
 * ```
 */
export function createPlaywrightFetch(
  requestContext: APIRequestContext,
  options?: PlaywrightFetchAdapterOptions
): FetchFunction {
  return async function playwrightFetch(
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> {
    const url = input instanceof Request ? input.url : input.toString();
    const method = init?.method || (input instanceof Request ? input.method : 'GET');
    const headers = transformHeaders(init?.headers || (input instanceof Request ? Object.fromEntries(input.headers) : undefined));
    const bodyOptions = transformBody(init?.body, headers);

    const apiResponse = await requestContext.fetch(url, {
      method,
      headers,
      ...bodyOptions,
      timeout: options?.timeout,
      ignoreHTTPSErrors: options?.ignoreHTTPSErrors,
      maxRedirects: options?.maxRedirects,
      maxRetries: options?.maxRetries,
    });

    return toResponse(apiResponse);
  };
}
