import { describe, expect, it, mock } from 'bun:test';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { createPlaywrightFetch } from '../src/fetch-adapter';

// Helper to create mock Playwright APIResponse
function createMockResponse(options: {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: Buffer | string;
}): APIResponse {
  const {
    status = 200,
    statusText = 'OK',
    headers = { 'content-type': 'application/json' },
    body = Buffer.from('{}'),
  } = options;

  return {
    status: () => status,
    statusText: () => statusText,
    headers: () => headers,
    body: mock(async () => (typeof body === 'string' ? Buffer.from(body) : body)),
    text: mock(async () => (typeof body === 'string' ? body : body.toString())),
    json: mock(async () => JSON.parse(typeof body === 'string' ? body : body.toString())),
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
    createMockResponse({ body: JSON.stringify({ success: true }) })
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

describe('createPlaywrightFetch', () => {
  describe('basic functionality', () => {
    it('should return a fetch-compatible function', () => {
      const requestContext = createMockRequestContext();
      const fetch = createPlaywrightFetch(requestContext);

      expect(typeof fetch).toBe('function');
    });

    it('should make request via Playwright fetch', async () => {
      const mockFetch = mock(async () =>
        createMockResponse({ body: JSON.stringify({ data: 'test' }) })
      );
      const requestContext = createMockRequestContext(mockFetch);
      const fetch = createPlaywrightFetch(requestContext);

      await fetch('https://api.example.com/users');

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should return a standard Response object', async () => {
      const requestContext = createMockRequestContext(async () =>
        createMockResponse({
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: 1, name: 'John' }),
        })
      );
      const fetch = createPlaywrightFetch(requestContext);

      const response = await fetch('https://api.example.com/users/1');

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
      expect(response.statusText).toBe('OK');
      expect(response.headers.get('content-type')).toBe('application/json');
    });

    it('should parse JSON response body', async () => {
      const requestContext = createMockRequestContext(async () =>
        createMockResponse({
          body: JSON.stringify({ id: 1, name: 'John' }),
        })
      );
      const fetch = createPlaywrightFetch(requestContext);

      const response = await fetch('https://api.example.com/users/1');
      const data = await response.json();

      expect(data).toEqual({ id: 1, name: 'John' });
    });
  });

  describe('URL handling', () => {
    it('should accept string URL', async () => {
      let capturedUrl = '';
      const requestContext = createMockRequestContext(async (url) => {
        capturedUrl = url;
        return createMockResponse({});
      });
      const fetch = createPlaywrightFetch(requestContext);

      await fetch('https://api.example.com/users');

      expect(capturedUrl).toBe('https://api.example.com/users');
    });

    it('should accept URL object', async () => {
      let capturedUrl = '';
      const requestContext = createMockRequestContext(async (url) => {
        capturedUrl = url;
        return createMockResponse({});
      });
      const fetch = createPlaywrightFetch(requestContext);

      await fetch(new URL('https://api.example.com/users'));

      expect(capturedUrl).toBe('https://api.example.com/users');
    });

    it('should accept Request object', async () => {
      let capturedUrl = '';
      const requestContext = createMockRequestContext(async (url) => {
        capturedUrl = url;
        return createMockResponse({});
      });
      const fetch = createPlaywrightFetch(requestContext);

      await fetch(new Request('https://api.example.com/users'));

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
      const fetch = createPlaywrightFetch(requestContext);

      await fetch('https://api.example.com/users', { method: 'POST' });

      expect(capturedOptions.method).toBe('POST');
    });

    it('should default to GET method', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const fetch = createPlaywrightFetch(requestContext);

      await fetch('https://api.example.com/users');

      expect(capturedOptions.method).toBe('GET');
    });

    it('should pass headers as object', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const fetch = createPlaywrightFetch(requestContext);

      await fetch('https://api.example.com/users', {
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        },
      });

      const passedHeaders = capturedOptions.headers as Record<string, string>;
      expect(passedHeaders['Authorization']).toBe('Bearer token');
      expect(passedHeaders['Content-Type']).toBe('application/json');
    });

    it('should pass Headers instance', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const fetch = createPlaywrightFetch(requestContext);

      const headers = new Headers();
      headers.set('Authorization', 'Bearer token');

      await fetch('https://api.example.com/users', { headers });

      const passedHeaders = capturedOptions.headers as Record<string, string>;
      expect(passedHeaders['authorization']).toBe('Bearer token');
    });

    it('should pass headers as array', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const fetch = createPlaywrightFetch(requestContext);

      await fetch('https://api.example.com/users', {
        headers: [
          ['Authorization', 'Bearer token'],
          ['Accept', 'application/json'],
        ],
      });

      const passedHeaders = capturedOptions.headers as Record<string, string>;
      expect(passedHeaders['Authorization']).toBe('Bearer token');
      expect(passedHeaders['Accept']).toBe('application/json');
    });
  });

  describe('body transformations', () => {
    it('should pass JSON body as data', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const fetch = createPlaywrightFetch(requestContext);

      await fetch('https://api.example.com/users', {
        method: 'POST',
        body: JSON.stringify({ name: 'John' }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(capturedOptions.data).toBe('{"name":"John"}');
    });

    it('should transform URLSearchParams to form', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const fetch = createPlaywrightFetch(requestContext);

      const params = new URLSearchParams();
      params.append('username', 'john');
      params.append('password', 'secret');

      await fetch('https://api.example.com/login', {
        method: 'POST',
        body: params,
      });

      expect(capturedOptions.form).toEqual({
        username: 'john',
        password: 'secret',
      });
    });

    it('should transform form-urlencoded string to form', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const fetch = createPlaywrightFetch(requestContext);

      await fetch('https://api.example.com/login', {
        method: 'POST',
        body: 'username=john&password=secret',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      expect(capturedOptions.form).toEqual({
        username: 'john',
        password: 'secret',
      });
    });

    it('should transform FormData to multipart', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const fetch = createPlaywrightFetch(requestContext);

      const formData = new FormData();
      formData.append('name', 'John');
      formData.append('email', 'john@example.com');

      await fetch('https://api.example.com/upload', {
        method: 'POST',
        body: formData,
      });

      const multipart = capturedOptions.multipart as Record<string, string>;
      expect(multipart['name']).toBe('John');
      expect(multipart['email']).toBe('john@example.com');
    });

    it('should handle null body', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const fetch = createPlaywrightFetch(requestContext);

      await fetch('https://api.example.com/users', {
        method: 'POST',
        body: null,
      });

      expect(capturedOptions.data).toBeUndefined();
      expect(capturedOptions.form).toBeUndefined();
      expect(capturedOptions.multipart).toBeUndefined();
    });
  });

  describe('adapter options', () => {
    it('should pass timeout option', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const fetch = createPlaywrightFetch(requestContext, { timeout: 5000 });

      await fetch('https://api.example.com/users');

      expect(capturedOptions.timeout).toBe(5000);
    });

    it('should pass ignoreHTTPSErrors option', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const fetch = createPlaywrightFetch(requestContext, {
        ignoreHTTPSErrors: true,
      });

      await fetch('https://api.example.com/users');

      expect(capturedOptions.ignoreHTTPSErrors).toBe(true);
    });

    it('should pass maxRedirects option', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const fetch = createPlaywrightFetch(requestContext, { maxRedirects: 5 });

      await fetch('https://api.example.com/users');

      expect(capturedOptions.maxRedirects).toBe(5);
    });

    it('should pass maxRetries option', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const fetch = createPlaywrightFetch(requestContext, { maxRetries: 3 });

      await fetch('https://api.example.com/users');

      expect(capturedOptions.maxRetries).toBe(3);
    });
  });

  describe('response handling', () => {
    it('should handle different status codes', async () => {
      const requestContext = createMockRequestContext(async () =>
        createMockResponse({ status: 404, statusText: 'Not Found' })
      );
      const fetch = createPlaywrightFetch(requestContext);

      const response = await fetch('https://api.example.com/users/999');

      expect(response.status).toBe(404);
      expect(response.statusText).toBe('Not Found');
      expect(response.ok).toBe(false);
    });

    it('should handle 201 Created', async () => {
      const requestContext = createMockRequestContext(async () =>
        createMockResponse({ status: 201, statusText: 'Created' })
      );
      const fetch = createPlaywrightFetch(requestContext);

      const response = await fetch('https://api.example.com/users', {
        method: 'POST',
      });

      expect(response.status).toBe(201);
      expect(response.ok).toBe(true);
    });

    it('should handle 500 Internal Server Error', async () => {
      const requestContext = createMockRequestContext(async () =>
        createMockResponse({ status: 500, statusText: 'Internal Server Error' })
      );
      const fetch = createPlaywrightFetch(requestContext);

      const response = await fetch('https://api.example.com/error');

      expect(response.status).toBe(500);
      expect(response.ok).toBe(false);
    });

    it('should provide default statusText for known codes', async () => {
      const requestContext = createMockRequestContext(async () =>
        createMockResponse({ status: 204, statusText: '' })
      );
      const fetch = createPlaywrightFetch(requestContext);

      const response = await fetch('https://api.example.com/users/1', {
        method: 'DELETE',
      });

      expect(response.status).toBe(204);
      expect(response.statusText).toBe('No Content');
    });

    it('should read response as text', async () => {
      const requestContext = createMockRequestContext(async () =>
        createMockResponse({
          headers: { 'content-type': 'text/plain' },
          body: 'Hello, World!',
        })
      );
      const fetch = createPlaywrightFetch(requestContext);

      const response = await fetch('https://api.example.com/text');
      const text = await response.text();

      expect(text).toBe('Hello, World!');
    });

    it('should read response as arrayBuffer', async () => {
      const requestContext = createMockRequestContext(async () =>
        createMockResponse({
          headers: { 'content-type': 'application/octet-stream' },
          body: Buffer.from([0x01, 0x02, 0x03, 0x04]),
        })
      );
      const fetch = createPlaywrightFetch(requestContext);

      const response = await fetch('https://api.example.com/binary');
      const buffer = await response.arrayBuffer();

      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBe(4);
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
        const fetch = createPlaywrightFetch(requestContext);

        await fetch('https://api.example.com/resource', { method });

        expect(capturedOptions.method).toBe(method);
      });
    }
  });

  describe('Request object support', () => {
    it('should extract method from Request object', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const fetch = createPlaywrightFetch(requestContext);

      const request = new Request('https://api.example.com/users', {
        method: 'POST',
      });

      await fetch(request);

      expect(capturedOptions.method).toBe('POST');
    });

    it('should extract headers from Request object', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const fetch = createPlaywrightFetch(requestContext);

      const request = new Request('https://api.example.com/users', {
        headers: { 'X-Custom-Header': 'test-value' },
      });

      await fetch(request);

      const passedHeaders = capturedOptions.headers as Record<string, string>;
      expect(passedHeaders['x-custom-header']).toBe('test-value');
    });

    it('should prefer init options over Request options', async () => {
      let capturedOptions: Record<string, unknown> = {};
      const requestContext = createMockRequestContext(async (_, options) => {
        capturedOptions = options as Record<string, unknown>;
        return createMockResponse({});
      });
      const fetch = createPlaywrightFetch(requestContext);

      const request = new Request('https://api.example.com/users', {
        method: 'GET',
      });

      await fetch(request, { method: 'POST' });

      expect(capturedOptions.method).toBe('POST');
    });
  });
});
