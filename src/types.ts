import type { APIRequestContext } from '@playwright/test';

/**
 * Playwright fetch options - extracted from APIRequestContext.fetch()
 */
export type PlaywrightFetchOptions = NonNullable<
  Parameters<APIRequestContext['fetch']>[1]
>;

/**
 * Options for the Playwright adapter
 * These map directly to Playwright's fetch options
 */
export type PlaywrightAdapterOptions = Pick<
  PlaywrightFetchOptions,
  'failOnStatusCode' | 'ignoreHTTPSErrors' | 'maxRedirects' | 'maxRetries'
>;
