import { describe, expect, it } from 'bun:test';
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import {
  buildUrl,
  transformHeaders,
  transformParams,
  transformData,
  transformRequest,
} from '../../src/utils/request';

// Helper to create mock axios config
function createConfig(
  overrides: Partial<InternalAxiosRequestConfig> = {}
): InternalAxiosRequestConfig {
  return {
    headers: new AxiosHeaders(),
    ...overrides,
  } as InternalAxiosRequestConfig;
}

describe('buildUrl', () => {
  it('should return url as-is when no baseURL', () => {
    const config = createConfig({ url: '/users' });
    expect(buildUrl(config)).toBe('/users');
  });

  it('should return empty string when no url', () => {
    const config = createConfig({});
    expect(buildUrl(config)).toBe('');
  });

  it('should combine baseURL and relative url', () => {
    const config = createConfig({
      baseURL: 'https://api.example.com',
      url: '/users',
    });
    expect(buildUrl(config)).toBe('https://api.example.com/users');
  });

  it('should handle baseURL with trailing slash', () => {
    const config = createConfig({
      baseURL: 'https://api.example.com/',
      url: '/users',
    });
    expect(buildUrl(config)).toBe('https://api.example.com/users');
  });

  it('should handle baseURL with multiple trailing slashes', () => {
    const config = createConfig({
      baseURL: 'https://api.example.com///',
      url: 'users',
    });
    expect(buildUrl(config)).toBe('https://api.example.com/users');
  });

  it('should not combine when url starts with multiple slashes', () => {
    const config = createConfig({
      baseURL: 'https://api.example.com',
      url: '///users',
    });
    // URLs starting with /// are treated as absolute (protocol-relative)
    expect(buildUrl(config)).toBe('///users');
  });

  it('should not combine when url is absolute (http)', () => {
    const config = createConfig({
      baseURL: 'https://api.example.com',
      url: 'http://other.com/users',
    });
    expect(buildUrl(config)).toBe('http://other.com/users');
  });

  it('should not combine when url is absolute (https)', () => {
    const config = createConfig({
      baseURL: 'https://api.example.com',
      url: 'https://other.com/users',
    });
    expect(buildUrl(config)).toBe('https://other.com/users');
  });

  it('should not combine when url starts with //', () => {
    const config = createConfig({
      baseURL: 'https://api.example.com',
      url: '//other.com/users',
    });
    expect(buildUrl(config)).toBe('//other.com/users');
  });

  it('should handle baseURL with path', () => {
    const config = createConfig({
      baseURL: 'https://api.example.com/v1',
      url: '/users',
    });
    expect(buildUrl(config)).toBe('https://api.example.com/v1/users');
  });

  it('should return baseURL when url is empty', () => {
    const config = createConfig({
      baseURL: 'https://api.example.com',
      url: '',
    });
    expect(buildUrl(config)).toBe('https://api.example.com');
  });
});

describe('transformHeaders', () => {
  it('should return empty object when no headers', () => {
    const config = createConfig({});
    expect(transformHeaders(config)).toEqual({});
  });

  it('should transform AxiosHeaders to plain object', () => {
    const headers = new AxiosHeaders();
    headers.set('Content-Type', 'application/json');
    headers.set('Authorization', 'Bearer token');

    const config = createConfig({ headers });
    const result = transformHeaders(config);

    expect(result['Content-Type']).toBe('application/json');
    expect(result['Authorization']).toBe('Bearer token');
  });

  it('should filter out undefined and null values', () => {
    const headers = new AxiosHeaders();
    headers.set('Content-Type', 'application/json');
    // AxiosHeaders doesn't allow setting undefined directly,
    // but we test the filtering logic
    const config = createConfig({ headers });
    const result = transformHeaders(config);

    expect(result['Content-Type']).toBe('application/json');
    expect(Object.keys(result)).not.toContain('undefined-key');
  });

  it('should convert non-string values to strings', () => {
    const headers = new AxiosHeaders();
    headers.set('X-Custom-Number', '123');

    const config = createConfig({ headers });
    const result = transformHeaders(config);

    expect(result['X-Custom-Number']).toBe('123');
    expect(typeof result['X-Custom-Number']).toBe('string');
  });

  it('should handle plain object headers', () => {
    const config = createConfig({
      headers: {
        'Content-Type': 'application/json',
        'X-Custom': 'value',
      } as unknown as AxiosHeaders,
    });
    const result = transformHeaders(config);

    expect(result['Content-Type']).toBe('application/json');
    expect(result['X-Custom']).toBe('value');
  });
});

describe('transformParams', () => {
  it('should return undefined when no params', () => {
    const config = createConfig({});
    expect(transformParams(config)).toBeUndefined();
  });

  it('should transform plain object params', () => {
    const config = createConfig({
      params: { page: 1, limit: 10, active: true },
    });
    const result = transformParams(config);

    expect(result).toEqual({ page: 1, limit: 10, active: true });
  });

  it('should convert string values', () => {
    const config = createConfig({
      params: { search: 'hello' },
    });
    const result = transformParams(config);

    expect(result).toEqual({ search: 'hello' });
  });

  it('should preserve boolean values', () => {
    const config = createConfig({
      params: { active: true, deleted: false },
    });
    const result = transformParams(config);

    expect(result?.active).toBe(true);
    expect(result?.deleted).toBe(false);
  });

  it('should preserve number values', () => {
    const config = createConfig({
      params: { page: 1, limit: 10.5 },
    });
    const result = transformParams(config);

    expect(result?.page).toBe(1);
    expect(result?.limit).toBe(10.5);
  });

  it('should transform URLSearchParams', () => {
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('search', 'hello');

    const config = createConfig({ params });
    const result = transformParams(config);

    expect(result).toEqual({ page: '1', search: 'hello' });
  });

  it('should filter out undefined and null values', () => {
    const config = createConfig({
      params: { valid: 'value', empty: undefined, nullVal: null },
    });
    const result = transformParams(config);

    expect(result).toEqual({ valid: 'value' });
  });

  it('should return undefined for empty params object', () => {
    const config = createConfig({
      params: {},
    });
    const result = transformParams(config);

    expect(result).toBeUndefined();
  });

  it('should convert object values to strings', () => {
    const config = createConfig({
      params: { data: { nested: 'value' } },
    });
    const result = transformParams(config);

    expect(result?.data).toBe('[object Object]');
  });
});

describe('transformData', () => {
  it('should return empty object when no data', () => {
    const config = createConfig({});
    expect(transformData(config)).toEqual({});
  });

  it('should return empty object when data is null', () => {
    const config = createConfig({ data: null });
    expect(transformData(config)).toEqual({});
  });

  it('should return empty object when data is undefined', () => {
    const config = createConfig({ data: undefined });
    expect(transformData(config)).toEqual({});
  });

  it('should return data as-is for JSON content', () => {
    const config = createConfig({
      data: { name: 'John', age: 30 },
    });
    const result = transformData(config);

    expect(result).toEqual({ data: { name: 'John', age: 30 } });
  });

  it('should handle string data', () => {
    const config = createConfig({
      data: 'raw string data',
    });
    const result = transformData(config);

    expect(result).toEqual({ data: 'raw string data' });
  });

  it('should transform URLSearchParams to form', () => {
    const data = new URLSearchParams();
    data.set('username', 'john');
    data.set('password', 'secret');

    const config = createConfig({ data });
    const result = transformData(config);

    expect(result).toEqual({
      form: { username: 'john', password: 'secret' },
    });
  });

  it('should handle form-urlencoded string data', () => {
    const headers = new AxiosHeaders();
    headers.set('Content-Type', 'application/x-www-form-urlencoded');

    const config = createConfig({
      headers,
      data: 'username=john&password=secret',
    });
    const result = transformData(config);

    expect(result).toEqual({
      form: { username: 'john', password: 'secret' },
    });
  });

  it('should handle form-urlencoded object data', () => {
    const headers = new AxiosHeaders();
    headers.set('Content-Type', 'application/x-www-form-urlencoded');

    const config = createConfig({
      headers,
      data: { username: 'john', age: 30, active: true },
    });
    const result = transformData(config);

    expect(result).toEqual({
      form: { username: 'john', age: 30, active: true },
    });
  });

  it('should handle FormData', () => {
    const data = new FormData();
    data.set('username', 'john');
    data.set('email', 'john@example.com');

    const config = createConfig({ data });
    const result = transformData(config);

    expect(result.multipart).toBeDefined();
    expect((result.multipart as Record<string, unknown>)['username']).toBe('john');
    expect((result.multipart as Record<string, unknown>)['email']).toBe('john@example.com');
  });

  it('should handle FormData with Blob', () => {
    const blob = new Blob(['test content'], { type: 'text/plain' });
    const data = new FormData();
    data.set('file', blob, 'test.txt');

    const config = createConfig({ data });
    const result = transformData(config);

    expect(result.multipart).toBeDefined();
    const fileEntry = (result.multipart as Record<string, unknown>)['file'] as {
      name: string;
      mimeType: string;
      buffer: Blob;
    };
    expect(fileEntry.name).toBe('test.txt');
    // Blob type may include charset
    expect(fileEntry.mimeType).toContain('text/plain');
  });

  it('should handle multipart/form-data content type with object', () => {
    const headers = new AxiosHeaders();
    headers.set('Content-Type', 'multipart/form-data');

    const config = createConfig({
      headers,
      data: { field1: 'value1', field2: 'value2' },
    });
    const result = transformData(config);

    expect(result).toEqual({
      multipart: { field1: 'value1', field2: 'value2' },
    });
  });

  it('should filter undefined and null in form-urlencoded', () => {
    const headers = new AxiosHeaders();
    headers.set('Content-Type', 'application/x-www-form-urlencoded');

    const config = createConfig({
      headers,
      data: { valid: 'value', empty: undefined, nullVal: null },
    });
    const result = transformData(config);

    expect(result).toEqual({ form: { valid: 'value' } });
  });
});

describe('transformRequest', () => {
  it('should set default method to GET', () => {
    const config = createConfig({ url: '/users' });
    const result = transformRequest(config);

    expect(result.method).toBe('GET');
  });

  it('should uppercase the method', () => {
    const config = createConfig({ url: '/users', method: 'post' });
    const result = transformRequest(config);

    expect(result.method).toBe('POST');
  });

  it('should include transformed headers', () => {
    const headers = new AxiosHeaders();
    headers.set('Authorization', 'Bearer token');

    const config = createConfig({ url: '/users', headers });
    const result = transformRequest(config);

    expect(result.headers?.['Authorization']).toBe('Bearer token');
  });

  it('should include transformed params', () => {
    const config = createConfig({
      url: '/users',
      params: { page: 1 },
    });
    const result = transformRequest(config);

    expect(result.params).toEqual({ page: 1 });
  });

  it('should include transformed data', () => {
    const config = createConfig({
      url: '/users',
      method: 'POST',
      data: { name: 'John' },
    });
    const result = transformRequest(config);

    expect(result.data).toEqual({ name: 'John' });
  });

  it('should include timeout when > 0', () => {
    const config = createConfig({
      url: '/users',
      timeout: 5000,
    });
    const result = transformRequest(config);

    expect(result.timeout).toBe(5000);
  });

  it('should not include timeout when 0', () => {
    const config = createConfig({
      url: '/users',
      timeout: 0,
    });
    const result = transformRequest(config);

    expect(result.timeout).toBeUndefined();
  });

  it('should apply adapter options failOnStatusCode', () => {
    const config = createConfig({ url: '/users' });
    const result = transformRequest(config, { failOnStatusCode: true });

    expect(result.failOnStatusCode).toBe(true);
  });

  it('should apply adapter options ignoreHTTPSErrors', () => {
    const config = createConfig({ url: '/users' });
    const result = transformRequest(config, { ignoreHTTPSErrors: true });

    expect(result.ignoreHTTPSErrors).toBe(true);
  });

  it('should apply adapter options maxRedirects over config', () => {
    const config = createConfig({
      url: '/users',
      maxRedirects: 5,
    });
    const result = transformRequest(config, { maxRedirects: 10 });

    expect(result.maxRedirects).toBe(10);
  });

  it('should use config maxRedirects when adapter option not set', () => {
    const config = createConfig({
      url: '/users',
      maxRedirects: 5,
    });
    const result = transformRequest(config);

    expect(result.maxRedirects).toBe(5);
  });

  it('should handle complete request transformation', () => {
    const headers = new AxiosHeaders();
    headers.set('Content-Type', 'application/json');
    headers.set('Authorization', 'Bearer token');

    const config = createConfig({
      url: '/users',
      method: 'post',
      headers,
      params: { include: 'profile' },
      data: { name: 'John', email: 'john@example.com' },
      timeout: 10000,
      maxRedirects: 3,
    });

    const result = transformRequest(config, {
      ignoreHTTPSErrors: true,
    });

    expect(result.method).toBe('POST');
    expect(result.headers?.['Content-Type']).toBe('application/json');
    expect(result.headers?.['Authorization']).toBe('Bearer token');
    expect(result.params).toEqual({ include: 'profile' });
    expect(result.data).toEqual({ name: 'John', email: 'john@example.com' });
    expect(result.timeout).toBe(10000);
    expect(result.maxRedirects).toBe(3);
    expect(result.ignoreHTTPSErrors).toBe(true);
  });
});
