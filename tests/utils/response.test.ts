import { describe, expect, it, mock } from 'bun:test';
import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import type { APIResponse } from '@playwright/test';
import {
  transformResponseHeaders,
  parseResponseBody,
  transformResponse,
} from '../../src/utils/response';

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
    headers = {},
    body = Buffer.from(''),
    json,
  } = options;

  return {
    status: () => status,
    statusText: () => statusText,
    headers: () => headers,
    body: mock(async () => (typeof body === 'string' ? Buffer.from(body) : body)),
    text: mock(async () => (typeof body === 'string' ? body : body.toString())),
    json: mock(async () => {
      if (json !== undefined) return json;
      const text = typeof body === 'string' ? body : body.toString();
      return JSON.parse(text);
    }),
    ok: () => status >= 200 && status < 300,
    url: () => 'https://api.example.com/test',
    dispose: mock(() => Promise.resolve()),
    headersArray: () => Object.entries(headers).map(([name, value]) => ({ name, value })),
    securityDetails: () => null,
    serverAddr: () => null,
    allHeaders: () => Promise.resolve(headers),
  } as unknown as APIResponse;
}

describe('transformResponseHeaders', () => {
  it('should pass through headers as-is', () => {
    const headers = {
      'content-type': 'application/json',
      'x-request-id': '12345',
    };

    const result = transformResponseHeaders(headers);

    expect(result).toEqual(headers);
  });

  it('should handle empty headers', () => {
    const result = transformResponseHeaders({});
    expect(result).toEqual({});
  });

  it('should preserve all header values', () => {
    const headers = {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-cache, no-store',
      'set-cookie': 'session=abc123; Path=/; HttpOnly',
    };

    const result = transformResponseHeaders(headers);

    expect(result['content-type']).toBe('application/json; charset=utf-8');
    expect(result['cache-control']).toBe('no-cache, no-store');
    expect(result['set-cookie']).toBe('session=abc123; Path=/; HttpOnly');
  });
});

describe('parseResponseBody', () => {
  describe('responseType: json (default)', () => {
    it('should parse JSON response', async () => {
      const response = createMockResponse({
        headers: { 'content-type': 'application/json' },
        json: { name: 'John', age: 30 },
      });
      const config = createConfig({});

      const result = await parseResponseBody(response, config);

      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should parse JSON with charset', async () => {
      const response = createMockResponse({
        headers: { 'content-type': 'application/json; charset=utf-8' },
        json: { success: true },
      });
      const config = createConfig({});

      const result = await parseResponseBody(response, config);

      expect(result).toEqual({ success: true });
    });

    it('should fall back to text for non-JSON content type', async () => {
      const response = createMockResponse({
        headers: { 'content-type': 'text/plain' },
        body: 'plain text response',
      });
      const config = createConfig({});

      const result = await parseResponseBody(response, config);

      expect(result).toBe('plain text response');
    });

    it('should fall back to text when JSON parsing fails', async () => {
      const invalidJsonBody = 'not valid json';
      const response = {
        status: () => 200,
        statusText: () => 'OK',
        headers: () => ({ 'content-type': 'application/json' }),
        body: mock(async () => Buffer.from(invalidJsonBody)),
        text: mock(async () => invalidJsonBody),
        json: mock(async () => {
          throw new SyntaxError('Unexpected token');
        }),
        ok: () => true,
        url: () => 'https://api.example.com/test',
        dispose: mock(() => Promise.resolve()),
        headersArray: () => [],
        securityDetails: () => null,
        serverAddr: () => null,
        allHeaders: () => Promise.resolve({ 'content-type': 'application/json' }),
      } as unknown as APIResponse;

      const config = createConfig({});

      const result = await parseResponseBody(response, config);

      expect(result).toBe(invalidJsonBody);
    });
  });

  describe('responseType: text', () => {
    it('should return text response', async () => {
      const response = createMockResponse({
        headers: { 'content-type': 'text/html' },
        body: '<html><body>Hello</body></html>',
      });
      const config = createConfig({ responseType: 'text' });

      const result = await parseResponseBody(response, config);

      expect(result).toBe('<html><body>Hello</body></html>');
    });

    it('should return text even for JSON content type', async () => {
      const response = createMockResponse({
        headers: { 'content-type': 'application/json' },
        body: '{"name":"John"}',
      });
      const config = createConfig({ responseType: 'text' });

      const result = await parseResponseBody(response, config);

      expect(result).toBe('{"name":"John"}');
    });
  });

  describe('responseType: arraybuffer', () => {
    it('should return ArrayBuffer', async () => {
      const bodyBuffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
      const response = createMockResponse({
        headers: { 'content-type': 'application/octet-stream' },
        body: bodyBuffer,
      });
      const config = createConfig({ responseType: 'arraybuffer' });

      const result = await parseResponseBody(response, config);

      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('responseType: blob', () => {
    it('should return Blob with content type', async () => {
      const response = createMockResponse({
        headers: { 'content-type': 'image/png' },
        body: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      });
      const config = createConfig({ responseType: 'blob' });

      const result = await parseResponseBody(response, config);

      expect(result).toBeInstanceOf(Blob);
      expect((result as Blob).type).toBe('image/png');
    });

    it('should handle empty content type', async () => {
      const response = createMockResponse({
        headers: {},
        body: Buffer.from([0x00, 0x01, 0x02]),
      });
      const config = createConfig({ responseType: 'blob' });

      const result = await parseResponseBody(response, config);

      expect(result).toBeInstanceOf(Blob);
      expect((result as Blob).type).toBe('');
    });
  });

  describe('responseType: stream', () => {
    it('should return Buffer for stream type', async () => {
      const bodyBuffer = Buffer.from('streaming data');
      const response = createMockResponse({
        headers: { 'content-type': 'application/octet-stream' },
        body: bodyBuffer,
      });
      const config = createConfig({ responseType: 'stream' });

      const result = await parseResponseBody(response, config);

      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });
});

describe('transformResponse', () => {
  it('should transform basic response', async () => {
    const response = createMockResponse({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      json: { message: 'success' },
    });
    const config = createConfig({ url: '/test', method: 'GET' });

    const result = await transformResponse(response, config);

    expect(result.status).toBe(200);
    expect(result.statusText).toBe('OK');
    expect(result.data).toEqual({ message: 'success' });
    expect(result.headers['content-type']).toBe('application/json');
    expect(result.config).toBe(config);
    expect(result.request).toBe(response);
  });

  it('should use mapped status text when not provided', async () => {
    const response = createMockResponse({
      status: 201,
      statusText: '',
      headers: {},
      body: '',
    });
    const config = createConfig({});

    const result = await transformResponse(response, config);

    expect(result.statusText).toBe('Created');
  });

  it('should handle 404 status', async () => {
    const response = createMockResponse({
      status: 404,
      statusText: '',
      headers: { 'content-type': 'application/json' },
      json: { error: 'Not found' },
    });
    const config = createConfig({});

    const result = await transformResponse(response, config);

    expect(result.status).toBe(404);
    expect(result.statusText).toBe('Not Found');
    expect(result.data).toEqual({ error: 'Not found' });
  });

  it('should handle 500 status', async () => {
    const response = createMockResponse({
      status: 500,
      statusText: '',
      headers: { 'content-type': 'application/json' },
      json: { error: 'Internal error' },
    });
    const config = createConfig({});

    const result = await transformResponse(response, config);

    expect(result.status).toBe(500);
    expect(result.statusText).toBe('Internal Server Error');
  });

  it('should handle unknown status code', async () => {
    const response = createMockResponse({
      status: 999,
      statusText: '',
      headers: {},
      body: '',
    });
    const config = createConfig({});

    const result = await transformResponse(response, config);

    expect(result.status).toBe(999);
    expect(result.statusText).toBe('Unknown');
  });

  it('should preserve original statusText if provided', async () => {
    const response = createMockResponse({
      status: 200,
      statusText: 'Custom Status',
      headers: {},
      body: '',
    });
    const config = createConfig({});

    const result = await transformResponse(response, config);

    expect(result.statusText).toBe('Custom Status');
  });

  it('should handle various common status codes', async () => {
    const statusCodes: Array<[number, string]> = [
      [100, 'Continue'],
      [200, 'OK'],
      [201, 'Created'],
      [204, 'No Content'],
      [301, 'Moved Permanently'],
      [302, 'Found'],
      [304, 'Not Modified'],
      [400, 'Bad Request'],
      [401, 'Unauthorized'],
      [403, 'Forbidden'],
      [404, 'Not Found'],
      [405, 'Method Not Allowed'],
      [408, 'Request Timeout'],
      [409, 'Conflict'],
      [410, 'Gone'],
      [422, 'Unprocessable Entity'],
      [429, 'Too Many Requests'],
      [500, 'Internal Server Error'],
      [501, 'Not Implemented'],
      [502, 'Bad Gateway'],
      [503, 'Service Unavailable'],
      [504, 'Gateway Timeout'],
    ];

    for (const [status, expectedText] of statusCodes) {
      const response = createMockResponse({
        status,
        statusText: '',
        headers: {},
        body: '',
      });
      const config = createConfig({});

      const result = await transformResponse(response, config);

      expect(result.statusText).toBe(expectedText);
    }
  });

  it('should handle response with all headers', async () => {
    const headers = {
      'content-type': 'application/json',
      'x-request-id': 'abc123',
      'cache-control': 'no-cache',
      'x-rate-limit': '100',
    };
    const response = createMockResponse({
      status: 200,
      headers,
      json: {},
    });
    const config = createConfig({});

    const result = await transformResponse(response, config);

    expect(result.headers).toEqual(headers);
  });

  it('should preserve generic type', async () => {
    interface User {
      id: number;
      name: string;
    }

    const response = createMockResponse({
      status: 200,
      headers: { 'content-type': 'application/json' },
      json: { id: 1, name: 'John' },
    });
    const config = createConfig({});

    const result = await transformResponse<User>(response, config);

    expect(result.data.id).toBe(1);
    expect(result.data.name).toBe('John');
  });
});
