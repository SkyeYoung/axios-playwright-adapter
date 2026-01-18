import { AxiosError } from 'axios';
import type { AxiosAdapter, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import type { APIRequestContext } from '@playwright/test';
import type { PlaywrightAdapterOptions } from './types';
import { buildUrl, transformRequest } from './utils/request';
import { transformResponse } from './utils/response';

/**
 * Create a Playwright adapter for axios
 *
 * Routes HTTP requests through Playwright's APIRequestContext,
 * enabling request/response visibility in Playwright traces.
 *
 * @example
 * ```typescript
 * import axios from 'axios';
 * import { test } from '@playwright/test';
 * import { createPlaywrightAdapter } from '@iskyex/axios-playwright-adapter';
 *
 * test('API call shows in trace', async ({ request }) => {
 *   const client = axios.create({
 *     adapter: createPlaywrightAdapter(request),
 *     baseURL: 'https://api.example.com',
 *   });
 *   const response = await client.get('/users');
 * });
 * ```
 */
export function createPlaywrightAdapter(
  requestContext: APIRequestContext,
  options?: PlaywrightAdapterOptions
): AxiosAdapter {
  return async function playwrightAdapter<T = unknown>(
    config: InternalAxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const url = buildUrl(config);
    const requestOptions = transformRequest(config, options);

    // Handle abort signal
    if (config.signal?.aborted) {
      throw new AxiosError('Request aborted', AxiosError.ERR_CANCELED, config);
    }

    try {
      const response = await requestContext.fetch(url, {
        method: requestOptions.method,
        headers: requestOptions.headers,
        data: requestOptions.data,
        form: requestOptions.form,
        multipart: requestOptions.multipart,
        params: requestOptions.params,
        timeout: requestOptions.timeout,
        failOnStatusCode: requestOptions.failOnStatusCode ?? false,
        ignoreHTTPSErrors: requestOptions.ignoreHTTPSErrors,
        maxRedirects: requestOptions.maxRedirects,
        maxRetries: requestOptions.maxRetries,
      });

      const axiosResponse = await transformResponse<T>(response, config);

      // Validate status if configured
      if (config.validateStatus && !config.validateStatus(axiosResponse.status)) {
        throw new AxiosError(
          `Request failed with status code ${axiosResponse.status}`,
          AxiosError.ERR_BAD_REQUEST,
          config,
          response,
          axiosResponse
        );
      }

      return axiosResponse;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw error;
      }

      // Convert Playwright errors to AxiosError
      const axiosError = new AxiosError(
        (error as Error).message || 'Request failed',
        AxiosError.ERR_NETWORK,
        config
      );
      axiosError.cause = error;
      throw axiosError;
    }
  };
}
