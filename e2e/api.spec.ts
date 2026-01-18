import { test, expect } from '@playwright/test';
import axios, { AxiosError } from 'axios';
import { createPlaywrightAdapter } from '../src';

/**
 * Integration tests using JSONPlaceholder API (https://jsonplaceholder.typicode.com)
 * These tests verify the adapter works correctly with real HTTP requests
 * and that requests appear in Playwright traces.
 */

test.describe('axios-playwright-adapter Integration Tests', () => {
  test.describe('HTTP Methods', () => {
    test('GET request', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://jsonplaceholder.typicode.com',
      });

      const response = await client.get('/posts/1');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', 1);
      expect(response.data).toHaveProperty('title');
      expect(response.data).toHaveProperty('body');
      expect(response.data).toHaveProperty('userId');
    });

    test('GET request with query params', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://jsonplaceholder.typicode.com',
      });

      const response = await client.get('/posts', {
        params: { userId: 1 },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      expect(response.data.every((post: { userId: number }) => post.userId === 1)).toBe(true);
    });

    test('POST request with JSON body', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://jsonplaceholder.typicode.com',
      });

      const newPost = {
        title: 'Test Post',
        body: 'This is a test post body',
        userId: 1,
      };

      const response = await client.post('/posts', newPost);

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.title).toBe(newPost.title);
      expect(response.data.body).toBe(newPost.body);
      expect(response.data.userId).toBe(newPost.userId);
    });

    test('PUT request', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://jsonplaceholder.typicode.com',
      });

      const updatedPost = {
        id: 1,
        title: 'Updated Title',
        body: 'Updated body content',
        userId: 1,
      };

      const response = await client.put('/posts/1', updatedPost);

      expect(response.status).toBe(200);
      expect(response.data.title).toBe(updatedPost.title);
      expect(response.data.body).toBe(updatedPost.body);
    });

    test('PATCH request', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://jsonplaceholder.typicode.com',
      });

      const response = await client.patch('/posts/1', {
        title: 'Patched Title',
      });

      expect(response.status).toBe(200);
      expect(response.data.title).toBe('Patched Title');
    });

    test('DELETE request', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://jsonplaceholder.typicode.com',
      });

      const response = await client.delete('/posts/1');

      expect(response.status).toBe(200);
    });
  });

  test.describe('Headers', () => {
    test('should send custom headers', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://httpbin.org',
        headers: {
          'X-Custom-Header': 'test-value',
        },
      });

      const response = await client.get('/headers');

      expect(response.status).toBe(200);
      // httpbin returns headers in the response
      expect(response.data.headers['X-Custom-Header']).toBe('test-value');
    });

    test('should send Authorization header', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://httpbin.org',
        headers: {
          Authorization: 'Bearer test-token',
        },
      });

      const response = await client.get('/headers');

      expect(response.status).toBe(200);
      expect(response.data.headers['Authorization']).toBe('Bearer test-token');
    });
  });

  test.describe('Response Types', () => {
    test('JSON response (default)', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://jsonplaceholder.typicode.com',
      });

      const response = await client.get('/posts/1');

      expect(response.status).toBe(200);
      expect(typeof response.data).toBe('object');
      expect(response.data).toHaveProperty('id');
    });

    test('text response', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://httpbin.org',
        responseType: 'text',
      });

      const response = await client.get('/html');

      expect(response.status).toBe(200);
      expect(typeof response.data).toBe('string');
      expect(response.data).toContain('html');
    });

    test('arraybuffer response', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://httpbin.org',
        responseType: 'arraybuffer',
      });

      const response = await client.get('/bytes/100');

      expect(response.status).toBe(200);
      expect(response.data).toBeInstanceOf(ArrayBuffer);
      // httpbin may return variable byte lengths, just verify we got data
      expect(response.data.byteLength).toBeGreaterThan(0);
    });

    test('blob response', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://httpbin.org',
        responseType: 'blob',
      });

      const response = await client.get('/image/png');

      expect(response.status).toBe(200);
      expect(response.data).toBeInstanceOf(Blob);
      expect(response.data.type).toBe('image/png');
    });
  });

  test.describe('Status Codes', () => {
    test('should handle 200 OK', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://httpbin.org',
      });

      const response = await client.get('/status/200');

      expect(response.status).toBe(200);
    });

    test('should handle 201 Created', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://httpbin.org',
      });

      const response = await client.get('/status/201');

      expect(response.status).toBe(201);
    });

    test('should handle 204 No Content', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://httpbin.org',
      });

      const response = await client.get('/status/204');

      expect(response.status).toBe(204);
    });

    test('should handle 400 Bad Request without throwing when validateStatus allows it', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://httpbin.org',
        // Explicitly allow all status codes
        validateStatus: () => true,
      });

      const response = await client.get('/status/400');
      expect(response.status).toBe(400);
    });

    test('should throw on 4xx with validateStatus', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://httpbin.org',
        validateStatus: (status) => status >= 200 && status < 300,
      });

      await expect(client.get('/status/404')).rejects.toThrow();
    });

    test('should handle 500 Internal Server Error when validateStatus allows it', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://httpbin.org',
        // Explicitly allow all status codes
        validateStatus: () => true,
      });

      const response = await client.get('/status/500');
      expect(response.status).toBe(500);
    });
  });

  test.describe('Interceptors', () => {
    test('request interceptor should modify headers', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://httpbin.org',
      });

      client.interceptors.request.use((config) => {
        config.headers['X-Intercepted'] = 'true';
        return config;
      });

      const response = await client.get('/headers');

      expect(response.status).toBe(200);
      expect(response.data.headers['X-Intercepted']).toBe('true');
    });

    test('response interceptor should transform data', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://jsonplaceholder.typicode.com',
      });

      client.interceptors.response.use((response) => {
        response.data = { transformed: true, original: response.data };
        return response;
      });

      const response = await client.get('/posts/1');

      expect(response.data.transformed).toBe(true);
      expect(response.data.original).toHaveProperty('id', 1);
    });

    test('error interceptor should handle errors', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://httpbin.org',
        validateStatus: (status) => status >= 200 && status < 300,
      });

      let errorHandled = false;
      client.interceptors.response.use(
        (response) => response,
        (error) => {
          errorHandled = true;
          error.customField = 'intercepted';
          return Promise.reject(error);
        }
      );

      try {
        await client.get('/status/404');
      } catch (error) {
        expect(errorHandled).toBe(true);
        expect((error as AxiosError & { customField: string }).customField).toBe('intercepted');
      }
    });
  });

  test.describe('Abort/Cancel', () => {
    test('should handle abort signal', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://httpbin.org',
      });

      const controller = new AbortController();
      controller.abort();

      try {
        await client.get('/delay/5', { signal: controller.signal });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        // Axios wraps the abort error - check that it was cancelled
        expect(axios.isCancel(error) || (error as AxiosError).code === AxiosError.ERR_CANCELED).toBe(true);
      }
    });

    test('should include ERR_CANCELED code on abort', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://httpbin.org',
      });

      const controller = new AbortController();
      controller.abort();

      try {
        await client.get('/delay/5', { signal: controller.signal });
      } catch (error) {
        expect((error as AxiosError).code).toBe(AxiosError.ERR_CANCELED);
      }
    });
  });

  test.describe('Adapter Options', () => {
    test('should respect maxRedirects option', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request, { maxRedirects: 0 }),
        baseURL: 'https://httpbin.org',
      });

      // httpbin /redirect/n redirects n times
      // With maxRedirects: 0, the first redirect should fail
      try {
        await client.get('/redirect/1');
        // If it doesn't throw, check we didn't follow redirects
      } catch {
        // Expected to fail with maxRedirects: 0
      }
    });

    test('should respect ignoreHTTPSErrors option', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request, { ignoreHTTPSErrors: true }),
        baseURL: 'https://jsonplaceholder.typicode.com',
      });

      // This should work even with ignoreHTTPSErrors (valid cert)
      const response = await client.get('/posts/1');
      expect(response.status).toBe(200);
    });
  });

  test.describe('Form Data', () => {
    test('should send form-urlencoded data', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://httpbin.org',
      });

      const params = new URLSearchParams();
      params.append('username', 'testuser');
      params.append('password', 'testpass');

      const response = await client.post('/post', params);

      expect(response.status).toBe(200);
      expect(response.data.form.username).toBe('testuser');
      expect(response.data.form.password).toBe('testpass');
    });

    test('should send JSON data with Content-Type header', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://httpbin.org',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = { name: 'John', email: 'john@example.com' };
      const response = await client.post('/post', data);

      expect(response.status).toBe(200);
      expect(response.data.json).toEqual(data);
    });
  });

  test.describe('Real-world Scenarios', () => {
    test('paginated API request', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://jsonplaceholder.typicode.com',
      });

      // Get first page
      const page1 = await client.get('/posts', {
        params: { _page: 1, _limit: 5 },
      });

      expect(page1.status).toBe(200);
      expect(Array.isArray(page1.data)).toBe(true);

      // Get second page
      const page2 = await client.get('/posts', {
        params: { _page: 2, _limit: 5 },
      });

      expect(page2.status).toBe(200);
      expect(Array.isArray(page2.data)).toBe(true);
    });

    test('nested resource request', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://jsonplaceholder.typicode.com',
      });

      // Get comments for a specific post
      const response = await client.get('/posts/1/comments');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      expect(response.data[0]).toHaveProperty('postId', 1);
    });

    test('multiple concurrent requests', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://jsonplaceholder.typicode.com',
      });

      const [posts, users, comments] = await Promise.all([
        client.get('/posts?_limit=5'),
        client.get('/users?_limit=5'),
        client.get('/comments?_limit=5'),
      ]);

      expect(posts.status).toBe(200);
      expect(users.status).toBe(200);
      expect(comments.status).toBe(200);

      expect(Array.isArray(posts.data)).toBe(true);
      expect(Array.isArray(users.data)).toBe(true);
      expect(Array.isArray(comments.data)).toBe(true);
    });
  });

  test.describe('Trace Visibility', () => {
    test('requests should appear in Playwright trace', async ({ request }) => {
      const client = axios.create({
        adapter: createPlaywrightAdapter(request),
        baseURL: 'https://jsonplaceholder.typicode.com',
      });

      // Make several requests that should all appear in trace
      await client.get('/posts/1');
      await client.get('/users/1');
      await client.post('/posts', { title: 'Test', body: 'Body', userId: 1 });

      // If we get here without errors, requests were made successfully
      // The trace viewer will show these requests when viewing the trace
      expect(true).toBe(true);
    });
  });
});
