import { describe, expect, it, mock } from 'bun:test';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { createPlaywrightAdapter } from '../src/axios-adapter';

// Helper to create mock axios config
function createConfig(
  overrides: Partial<InternalAxiosRequestConfig> = {}
): InternalAxiosRequestConfig {
  return {
    headers: new AxiosHeaders(),
    ...overrides,
  } as InternalAxiosRequestConfig;
}

// Helper to create mock Playwright APIResponse
function createMockResponse(options: {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: Buffer | string;
  json?: unknown;
}): APIResponse {
  const {
    status = 200,
    statusText = 'OK',
    headers = { 'content-type': 'application/json' },
    body = Buffer.from('{}'),
    json = {},
  } = options;

  return {
    status: () => status,
    statusText: () => statusText,
    headers: () => headers,
    body: mock(async () => (typeof body === 'string' ? Buffer.from(body) : body)),
    text: mock(async () => (typeof body === 'string' ? body : body.toString())),
    json: mock(async () => json),
    ok: () => status >= 200 && status < 300,
    url: () => 'https://api.example.com/test',
    dispose: mock(() => Promise.resolve()),
    headersArray: () => Object.entries(headers).map(([name, value]) => ({ name, value })),
    securityDetails: () => null,
    serverAddr: () => null,
    allHeaders: () => Promise.resolve(headers),
  } as unknown as APIResponse;
}

// Helper to create mock APIRequestContext
function createMockRequestContext(
  fetchImpl?: (url: string, options: unknown) => Promise<APIResponse>
): APIRequestContext {
  const defaultFetch = mock(async () =>
    createMockResponse({ json: { success: true } })
  );

  return {
    fetch: fetchImpl ? mock(fetchImpl) : defaultFetch,
    get: mock(async () => createMockResponse({})),
    post: mock(async () => createMockResponse({})),
    put: mock(async () => createMockResponse({})),
    patch: mock(async () => createMockResponse({})),
    delete: mock(async () => createMockResponse({})),
    head: mock(async () => createMockResponse({})),
    dispose: mock(() => Promise.resolve()),
    storageState: mock(async () => ({ cookies: [], origins: [] })),
  } as unknown as APIRequestContext;
}

describe('createPlaywrightAdapter', () => {
  describe('basic functionality', () => {
    it('should return an adapter function', () => {
      const requestContext = createMockRequestContext();
      const adapter = createPlaywrightAdapter(requestContext);

      expect(typeof adapter).toBe('function');
    });

    it('should make request via Playwright fetch', async () => {
      const mockFetch = mock(async () =>
        createMockResponse({ json: { data: 'test' } })
      );
      const requestContext = createMockRequestContext(mockFetch);
      const adapter = createPlaywrightAdapter(requestContext);

      const config = createConfig({
        url: 'https://api.example.com/users',
        method: 'GET',
      });

      await adapter(config);

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should return axios-compatible response', async () => {
      const requestContext = createMockRequestContext(async () =>
        createMockResponse({
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          json: { id: 1, name: 'John' },
        })
      );
      const adapter = createPlaywrightAdapter(requestContext);

      const config = createConfig({
        url: 'https://api.example.com/users/1',
        method: 'GET',
      });

      const response = await adapter(config);

      expect(response.status).toBe(200);
      expect(response.statusText).toBe('OK');
      expect(response.data).toEqual({ id: 1, name: 'John' });
      expect(response.headers['content-type']).toBe('application/json');
      expect(response.config).toBe(config);
    });
  });

  describe('URL building', () => {
    it('should use full URL from config', async () => {
      let capturedUrl = '';
      const requestContext = createMockRequestContext(async (url) => {
        capturedUrl = url;
        return createMockResponse({});
      });
      const adapter = createPlaywrightAdapter(requestContext);

      const config = createConfig({
        url: 'https://api.example.com/users',
      });

      await adapter(config);

      expect(capturedUrl).toBe('https://api.example.com/users');
    });

    it('should combine baseURL with relative URL', async () => {
      let capturedUrl = '';
      const requestContext = createMockRequestContext(async (url) => {
        capturedUrl = url;
        return createMockResponse({});
      });
      const adapter = createPlaywrightAdapter(requestContext);

      const config = createConfig({
        baseURL: 'https://api.example.com',
        url: '/users',
      });

      await adapter(config);

      expect(capturedUrl).toBe('https://api.example.com/users');
    });
  });

  describe('request options', () => {
    it('should pass method to Playwright', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const adapter = createPlaywrightAdapter(requestContext);

      const config = createConfig({
        url: 'https://api.example.com/users',
        method: 'POST',
      });

      await adapter(config);

      expect(capturedOptions.method).toBe('POST');
    });

    it('should pass headers to Playwright', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const adapter = createPlaywrightAdapter(requestContext);

      const headers = new AxiosHeaders();
      headers.set('Authorization', 'Bearer token');
      headers.set('Content-Type', 'application/json');

      const config = createConfig({
        url: 'https://api.example.com/users',
        method: 'GET',
        headers,
      });

      await adapter(config);

      const passedHeaders = capturedOptions.headers as Record<string, string>;
      expect(passedHeaders['Authorization']).toBe('Bearer token');
      expect(passedHeaders['Content-Type']).toBe('application/json');
    });

    it('should pass data to Playwright', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const adapter = createPlaywrightAdapter(requestContext);

      const config = createConfig({
        url: 'https://api.example.com/users',
        method: 'POST',
        data: { name: 'John', email: 'john@example.com' },
      });

      await adapter(config);

      expect(capturedOptions.data).toEqual({ name: 'John', email: 'john@example.com' });
    });

    it('should pass params to Playwright', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const adapter = createPlaywrightAdapter(requestContext);

      const config = createConfig({
        url: 'https://api.example.com/users',
        params: { page: 1, limit: 10 },
      });

      await adapter(config);

      expect(capturedOptions.params).toEqual({ page: 1, limit: 10 });
    });

    it('should pass timeout to Playwright', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const adapter = createPlaywrightAdapter(requestContext);

      const config = createConfig({
        url: 'https://api.example.com/users',
        timeout: 5000,
      });

      await adapter(config);

      expect(capturedOptions.timeout).toBe(5000);
    });
  });

  describe('adapter options', () => {
    it('should pass failOnStatusCode option', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const adapter = createPlaywrightAdapter(requestContext, {
        failOnStatusCode: true,
      });

      const config = createConfig({
        url: 'https://api.example.com/users',
      });

      await adapter(config);

      expect(capturedOptions.failOnStatusCode).toBe(true);
    });

    it('should pass ignoreHTTPSErrors option', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const adapter = createPlaywrightAdapter(requestContext, {
        ignoreHTTPSErrors: true,
      });

      const config = createConfig({
        url: 'https://api.example.com/users',
      });

      await adapter(config);

      expect(capturedOptions.ignoreHTTPSErrors).toBe(true);
    });

    it('should pass maxRedirects option', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const adapter = createPlaywrightAdapter(requestContext, {
        maxRedirects: 5,
      });

      const config = createConfig({
        url: 'https://api.example.com/users',
      });

      await adapter(config);

      expect(capturedOptions.maxRedirects).toBe(5);
    });

    it('should default failOnStatusCode to false', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const adapter = createPlaywrightAdapter(requestContext);

      const config = createConfig({
        url: 'https://api.example.com/users',
      });

      await adapter(config);

      expect(capturedOptions.failOnStatusCode).toBe(false);
    });
  });

  describe('status validation', () => {
    it('should throw AxiosError when validateStatus returns false', async () => {
      const requestContext = createMockRequestContext(async () =>
        createMockResponse({ status: 404 })
      );
      const adapter = createPlaywrightAdapter(requestContext);

      const config = createConfig({
        url: 'https://api.example.com/users/999',
        validateStatus: (status) => status >= 200 && status < 300,
      });

      try {
        await adapter(config);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(AxiosError);
        expect((error as AxiosError).code).toBe(AxiosError.ERR_BAD_REQUEST);
        expect((error as AxiosError).response?.status).toBe(404);
      }
    });

    it('should not throw when validateStatus returns true', async () => {
      const requestContext = createMockRequestContext(async () =>
        createMockResponse({ status: 404 })
      );
      const adapter = createPlaywrightAdapter(requestContext);

      const config = createConfig({
        url: 'https://api.example.com/users/999',
        validateStatus: () => true, // Accept all status codes
      });

      const response = await adapter(config);

      expect(response.status).toBe(404);
    });

    it('should not validate when validateStatus is not set', async () => {
      const requestContext = createMockRequestContext(async () =>
        createMockResponse({ status: 500 })
      );
      const adapter = createPlaywrightAdapter(requestContext);

      const config = createConfig({
        url: 'https://api.example.com/users',
      });

      const response = await adapter(config);

      expect(response.status).toBe(500);
    });
  });

  describe('abort signal handling', () => {
    it('should throw ERR_CANCELED when signal is already aborted', async () => {
      const requestContext = createMockRequestContext();
      const adapter = createPlaywrightAdapter(requestContext);

      const controller = new AbortController();
      controller.abort();

      const config = createConfig({
        url: 'https://api.example.com/users',
        signal: controller.signal,
      });

      try {
        await adapter(config);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(AxiosError);
        expect((error as AxiosError).code).toBe(AxiosError.ERR_CANCELED);
        expect((error as AxiosError).message).toBe('Request aborted');
      }
    });

    it('should work normally without signal', async () => {
      const requestContext = createMockRequestContext(async () =>
        createMockResponse({ json: { success: true } })
      );
      const adapter = createPlaywrightAdapter(requestContext);

      const config = createConfig({
        url: 'https://api.example.com/users',
      });

      const response = await adapter(config);

      expect(response.data).toEqual({ success: true });
    });

  });

  describe('error handling', () => {
    it('should wrap Playwright errors in AxiosError', async () => {
      const requestContext = createMockRequestContext(async () => {
        throw new Error('Network error');
      });
      const adapter = createPlaywrightAdapter(requestContext);

      const config = createConfig({
        url: 'https://api.example.com/users',
      });

      try {
        await adapter(config);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(AxiosError);
        expect((error as AxiosError).code).toBe(AxiosError.ERR_NETWORK);
        expect((error as AxiosError).message).toBe('Network error');
        expect((error as AxiosError).cause).toBeInstanceOf(Error);
      }
    });

    it('should preserve AxiosError as-is', async () => {
      const originalError = new AxiosError(
        'Custom error',
        'CUSTOM_CODE',
        undefined,
        null,
        undefined
      );
      const requestContext = createMockRequestContext(async () => {
        throw originalError;
      });
      const adapter = createPlaywrightAdapter(requestContext);

      const config = createConfig({
        url: 'https://api.example.com/users',
      });

      try {
        await adapter(config);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBe(originalError);
        expect((error as AxiosError).code).toBe('CUSTOM_CODE');
      }
    });

    it('should include config in wrapped error', async () => {
      const requestContext = createMockRequestContext(async () => {
        throw new Error('Connection refused');
      });
      const adapter = createPlaywrightAdapter(requestContext);

      const config = createConfig({
        url: 'https://api.example.com/users',
        method: 'GET',
      });

      try {
        await adapter(config);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect((error as AxiosError).config).toBe(config);
      }
    });

    it('should handle error with empty message', async () => {
      const requestContext = createMockRequestContext(async () => {
        throw new Error('');
      });
      const adapter = createPlaywrightAdapter(requestContext);

      const config = createConfig({
        url: 'https://api.example.com/users',
      });

      try {
        await adapter(config);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(AxiosError);
        expect((error as AxiosError).message).toBe('Request failed');
      }
    });
  });

  describe('response types', () => {
    it('should handle JSON response', async () => {
      const requestContext = createMockRequestContext(async () =>
        createMockResponse({
          headers: { 'content-type': 'application/json' },
          json: { users: [{ id: 1 }, { id: 2 }] },
        })
      );
      const adapter = createPlaywrightAdapter(requestContext);

      const config = createConfig({
        url: 'https://api.example.com/users',
        responseType: 'json',
      });

      const response = await adapter(config);

      expect(response.data).toEqual({ users: [{ id: 1 }, { id: 2 }] });
    });

    it('should handle text response', async () => {
      const requestContext = createMockRequestContext(async () =>
        createMockResponse({
          headers: { 'content-type': 'text/plain' },
          body: 'Hello, World!',
        })
      );
      const adapter = createPlaywrightAdapter(requestContext);

      const config = createConfig({
        url: 'https://api.example.com/text',
        responseType: 'text',
      });

      const response = await adapter(config);

      expect(response.data).toBe('Hello, World!');
    });

    it('should handle blob response', async () => {
      const requestContext = createMockRequestContext(async () =>
        createMockResponse({
          headers: { 'content-type': 'image/png' },
          body: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        })
      );
      const adapter = createPlaywrightAdapter(requestContext);

      const config = createConfig({
        url: 'https://api.example.com/image',
        responseType: 'blob',
      });

      const response = await adapter(config);

      expect(response.data).toBeInstanceOf(Blob);
    });
  });

  describe('HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

    for (const method of methods) {
      it(`should handle ${method} requests`, async () => {
        let capturedOptions: Record<string, unknown> = {};
        const requestContext = createMockRequestContext(async (_, options) => {
          capturedOptions = options as Record<string, unknown>;
          return createMockResponse({});
        });
        const adapter = createPlaywrightAdapter(requestContext);

        const config = createConfig({
          url: 'https://api.example.com/resource',
          method: method.toLowerCase(),
        });

        await adapter(config);

        expect(capturedOptions.method).toBe(method);
      });
    }
  });
});
