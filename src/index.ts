/**
 *
 * A Playwright adapter for axios that routes HTTP requests through
 * Playwright's APIRequestContext, enabling request/response visibility
 * in Playwright traces and integration with Playwright's network features.
 *
 * Also provides a fetch-compatible adapter for use with better-fetch
 * and other fetch-based HTTP clients.
 */

// Axios adapter
export { createPlaywrightAdapter } from './axios-adapter';
export type { PlaywrightAdapterOptions, PlaywrightFetchOptions } from './types';

// Fetch adapter (for better-fetch compatibility)
export { createPlaywrightFetch } from './fetch-adapter';
export type {
  PlaywrightFetchAdapterOptions,
  FetchFunction,
} from './fetch-adapter';
