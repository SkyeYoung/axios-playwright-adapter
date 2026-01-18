import type { InternalAxiosRequestConfig } from 'axios';
import type { PlaywrightAdapterOptions, PlaywrightFetchOptions } from '../types';
import { isAbsoluteURL, combineURLs } from './shared';

export function buildUrl(config: InternalAxiosRequestConfig): string {
  const url = config.url || '';

  if (config.baseURL && !isAbsoluteURL(url)) {
    return combineURLs(config.baseURL, url);
  }

  return url;
}

export function transformHeaders(
  config: InternalAxiosRequestConfig
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (config.headers) {
    const rawHeaders =
      typeof config.headers.toJSON === 'function'
        ? config.headers.toJSON()
        : config.headers;

    for (const [key, value] of Object.entries(rawHeaders)) {
      if (value !== undefined && value !== null) {
        headers[key] = String(value);
      }
    }
  }

  return headers;
}

export function transformParams(
  config: InternalAxiosRequestConfig
): Record<string, string | number | boolean> | undefined {
  if (!config.params) return undefined;

  if (config.params instanceof URLSearchParams) {
    return Object.fromEntries(config.params);
  }

  const params: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(config.params)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'boolean' || typeof value === 'number') {
        params[key] = value;
      } else {
        params[key] = String(value);
      }
    }
  }

  return Object.keys(params).length > 0 ? params : undefined;
}

function getContentType(config: InternalAxiosRequestConfig): string | undefined {
  const contentType = config.headers?.get?.('Content-Type');
  return typeof contentType === 'string' ? contentType.toLowerCase() : undefined;
}

function isFormData(data: unknown): data is FormData {
  return typeof FormData !== 'undefined' && data instanceof FormData;
}

function isURLSearchParams(data: unknown): data is URLSearchParams {
  return typeof URLSearchParams !== 'undefined' && data instanceof URLSearchParams;
}

export function transformData(
  config: InternalAxiosRequestConfig
): Pick<PlaywrightFetchOptions, 'data' | 'form' | 'multipart'> {
  const data = config.data;

  if (data === undefined || data === null) {
    return {};
  }

  const contentType = getContentType(config);

  if (isFormData(data)) {
    const multipart: NonNullable<PlaywrightFetchOptions['multipart']> = {};
    data.forEach((value, key) => {
      if (value instanceof Blob) {
        multipart[key] = {
          name: value instanceof File ? value.name : 'blob',
          mimeType: value.type,
          buffer: value as unknown as Buffer,
        };
      } else {
        multipart[key] = value as string;
      }
    });
    return { multipart };
  }

  if (isURLSearchParams(data)) {
    return { form: Object.fromEntries(data) };
  }

  if (contentType?.includes('application/x-www-form-urlencoded')) {
    if (typeof data === 'string') {
      return { form: Object.fromEntries(new URLSearchParams(data)) };
    }
    if (typeof data === 'object') {
      const form: Record<string, string | number | boolean> = {};
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (value !== undefined && value !== null) {
          form[key] =
            typeof value === 'boolean' || typeof value === 'number'
              ? value
              : String(value);
        }
      }
      return { form };
    }
  }

  if (contentType?.includes('multipart/form-data')) {
    if (typeof data === 'object' && !Buffer.isBuffer(data)) {
      return { multipart: data as NonNullable<PlaywrightFetchOptions['multipart']> };
    }
  }

  return { data };
}

export function transformRequest(
  config: InternalAxiosRequestConfig,
  adapterOptions?: PlaywrightAdapterOptions
): PlaywrightFetchOptions {
  const options: PlaywrightFetchOptions = {
    method: config.method?.toUpperCase() || 'GET',
    headers: transformHeaders(config),
    params: transformParams(config),
    ...transformData(config),
  };

  if (config.timeout && config.timeout > 0) {
    options.timeout = config.timeout;
  }

  if (adapterOptions?.failOnStatusCode !== undefined) {
    options.failOnStatusCode = adapterOptions.failOnStatusCode;
  }

  if (adapterOptions?.ignoreHTTPSErrors !== undefined) {
    options.ignoreHTTPSErrors = adapterOptions.ignoreHTTPSErrors;
  }

  if (adapterOptions?.maxRedirects !== undefined) {
    options.maxRedirects = adapterOptions.maxRedirects;
  } else if (config.maxRedirects !== undefined) {
    options.maxRedirects = config.maxRedirects;
  }

  if (adapterOptions?.maxRetries !== undefined) {
    options.maxRetries = adapterOptions.maxRetries;
  }

  return options;
}
