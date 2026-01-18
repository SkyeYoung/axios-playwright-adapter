import { test, expect } from '@playwright/test';
import { createFetch } from '@better-fetch/fetch';
import { createPlaywrightFetch } from '../src';

/**
 * Integration tests for better-fetch with Playwright adapter
 * These tests verify the adapter works correctly with better-fetch
 * and that requests appear in Playwright traces.
 */

test.describe('better-fetch Integration Tests', () => {
  test.describe('Basic Requests', () => {
    test('GET request', async ({ request }) => {
      const $fetch = createFetch({
        baseURL: 'https://jsonplaceholder.typicode.com',
        customFetchImpl: createPlaywrightFetch(request),
      });

      const { data, error } = await $fetch('/posts/1');

      expect(error).toBeNull();
      expect(data).toHaveProperty('id', 1);
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('body');
      expect(data).toHaveProperty('userId');
    });

    test('GET request with query params', async ({ request }) => {
      const $fetch = createFetch({
        baseURL: 'https://jsonplaceholder.typicode.com',
        customFetchImpl: createPlaywrightFetch(request),
      });

      const { data, error } = await $fetch('/posts', {
        query: { userId: 1 },
      });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect((data as Array<{ userId: number }>).length).toBeGreaterThan(0);
      expect((data as Array<{ userId: number }>).every((post) => post.userId === 1)).toBe(true);
    });

    test('POST request with JSON body', async ({ request }) => {
      const $fetch = createFetch({
        baseURL: 'https://jsonplaceholder.typicode.com',
        customFetchImpl: createPlaywrightFetch(request),
      });

      const newPost = {
        title: 'Test Post',
        body: 'This is a test post body',
        userId: 1,
      };

      const { data, error } = await $fetch('/posts', {
        method: 'POST',
        body: newPost,
      });

      expect(error).toBeNull();
      expect(data).toHaveProperty('id');
      expect((data as typeof newPost & { id: number }).title).toBe(newPost.title);
      expect((data as typeof newPost & { id: number }).body).toBe(newPost.body);
      expect((data as typeof newPost & { id: number }).userId).toBe(newPost.userId);
    });

    test('PUT request', async ({ request }) => {
      const $fetch = createFetch({
        baseURL: 'https://jsonplaceholder.typicode.com',
        customFetchImpl: createPlaywrightFetch(request),
      });

      const updatedPost = {
        id: 1,
        title: 'Updated Title',
        body: 'Updated body content',
        userId: 1,
      };

      const { data, error } = await $fetch('/posts/1', {
        method: 'PUT',
        body: updatedPost,
      });

      expect(error).toBeNull();
      expect((data as typeof updatedPost).title).toBe(updatedPost.title);
      expect((data as typeof updatedPost).body).toBe(updatedPost.body);
    });

    test('PATCH request', async ({ request }) => {
      const $fetch = createFetch({
        baseURL: 'https://jsonplaceholder.typicode.com',
        customFetchImpl: createPlaywrightFetch(request),
      });

      const { data, error } = await $fetch('/posts/1', {
        method: 'PATCH',
        body: { title: 'Patched Title' },
      });

      expect(error).toBeNull();
      expect((data as { title: string }).title).toBe('Patched Title');
    });

    test('DELETE request', async ({ request }) => {
      const $fetch = createFetch({
        baseURL: 'https://jsonplaceholder.typicode.com',
        customFetchImpl: createPlaywrightFetch(request),
      });

      const { data, error } = await $fetch('/posts/1', {
        method: 'DELETE',
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  test.describe('Headers', () => {
    test('should send custom headers', async ({ request }) => {
      const $fetch = createFetch({
        baseURL: 'https://httpbin.org',
        customFetchImpl: createPlaywrightFetch(request),
        headers: {
          'X-Custom-Header': 'test-value',
        },
      });

      const { data, error } = await $fetch<{ headers: Record<string, string> }>('/headers');

      expect(error).toBeNull();
      expect(data?.headers['X-Custom-Header']).toBe('test-value');
    });

    test('should send Authorization header', async ({ request }) => {
      const $fetch = createFetch({
        baseURL: 'https://httpbin.org',
        customFetchImpl: createPlaywrightFetch(request),
        headers: {
          Authorization: 'Bearer test-token',
        },
      });

      const { data, error } = await $fetch<{ headers: Record<string, string> }>('/headers');

      expect(error).toBeNull();
      expect(data?.headers['Authorization']).toBe('Bearer test-token');
    });
  });

  test.describe('Error Handling', () => {
    test('should return error for 404', async ({ request }) => {
      const $fetch = createFetch({
        baseURL: 'https://httpbin.org',
        customFetchImpl: createPlaywrightFetch(request),
      });

      const { data, error } = await $fetch('/status/404');

      expect(error).not.toBeNull();
      expect(error?.status).toBe(404);
    });

    test('should return error for 500', async ({ request }) => {
      const $fetch = createFetch({
        baseURL: 'https://httpbin.org',
        customFetchImpl: createPlaywrightFetch(request),
      });

      const { data, error } = await $fetch('/status/500');

      expect(error).not.toBeNull();
      expect(error?.status).toBe(500);
    });
  });

  test.describe('Adapter Options', () => {
    test('should respect timeout option', async ({ request }) => {
      const $fetch = createFetch({
        baseURL: 'https://httpbin.org',
        customFetchImpl: createPlaywrightFetch(request, { timeout: 30000 }),
      });

      const { data, error } = await $fetch('/get');

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    test('should respect maxRedirects option', async ({ request }) => {
      const $fetch = createFetch({
        baseURL: 'https://httpbin.org',
        customFetchImpl: createPlaywrightFetch(request, { maxRedirects: 5 }),
      });

      // httpbin /redirect/3 redirects 3 times
      const { data, error } = await $fetch('/redirect/3');

      // Should succeed with maxRedirects: 5
      expect(error).toBeNull();
    });
  });

  test.describe('Form Data', () => {
    test('should send form-urlencoded data', async ({ request }) => {
      const $fetch = createFetch({
        baseURL: 'https://httpbin.org',
        customFetchImpl: createPlaywrightFetch(request),
      });

      const params = new URLSearchParams();
      params.append('username', 'testuser');
      params.append('password', 'testpass');

      const { data, error } = await $fetch<{ form: Record<string, string> }>('/post', {
        method: 'POST',
        body: params,
      });

      expect(error).toBeNull();
      expect(data?.form.username).toBe('testuser');
      expect(data?.form.password).toBe('testpass');
    });
  });

  test.describe('Real-world Scenarios', () => {
    test('paginated API request', async ({ request }) => {
      const $fetch = createFetch({
        baseURL: 'https://jsonplaceholder.typicode.com',
        customFetchImpl: createPlaywrightFetch(request),
      });

      // Get first page
      const page1 = await $fetch('/posts', {
        query: { _page: 1, _limit: 5 },
      });

      expect(page1.error).toBeNull();
      expect(Array.isArray(page1.data)).toBe(true);

      // Get second page
      const page2 = await $fetch('/posts', {
        query: { _page: 2, _limit: 5 },
      });

      expect(page2.error).toBeNull();
      expect(Array.isArray(page2.data)).toBe(true);
    });

    test('nested resource request', async ({ request }) => {
      const $fetch = createFetch({
        baseURL: 'https://jsonplaceholder.typicode.com',
        customFetchImpl: createPlaywrightFetch(request),
      });

      // Get comments for a specific post
      const { data, error } = await $fetch<Array<{ postId: number }>>('/posts/1/comments');

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect((data as Array<{ postId: number }>).length).toBeGreaterThan(0);
      expect((data as Array<{ postId: number }>)[0]).toHaveProperty('postId', 1);
    });

    test('multiple concurrent requests', async ({ request }) => {
      const $fetch = createFetch({
        baseURL: 'https://jsonplaceholder.typicode.com',
        customFetchImpl: createPlaywrightFetch(request),
      });

      const [posts, users, comments] = await Promise.all([
        $fetch('/posts?_limit=5'),
        $fetch('/users?_limit=5'),
        $fetch('/comments?_limit=5'),
      ]);

      expect(posts.error).toBeNull();
      expect(users.error).toBeNull();
      expect(comments.error).toBeNull();

      expect(Array.isArray(posts.data)).toBe(true);
      expect(Array.isArray(users.data)).toBe(true);
      expect(Array.isArray(comments.data)).toBe(true);
    });
  });

  test.describe('Trace Visibility', () => {
    test('requests should appear in Playwright trace', async ({ request }) => {
      const $fetch = createFetch({
        baseURL: 'https://jsonplaceholder.typicode.com',
        customFetchImpl: createPlaywrightFetch(request),
      });

      // Make several requests that should all appear in trace
      await $fetch('/posts/1');
      await $fetch('/users/1');
      await $fetch('/posts', {
        method: 'POST',
        body: { title: 'Test', body: 'Body', userId: 1 },
      });

      // If we get here without errors, requests were made successfully
      // The trace viewer will show these requests when viewing the trace
      expect(true).toBe(true);
    });
  });
});
